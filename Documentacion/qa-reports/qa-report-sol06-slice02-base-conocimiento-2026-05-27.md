# Reporte QA — SOL-06 Sistema de Base de Conocimiento (Slice 2: Estrategia de Chunking)

**Fecha:** 27 de mayo de 2026  
**QA:** jhon99mendoza + Agente QA  
**PR:** #21 — `feat(SOL-06): Sistema de Base de Conocimiento — MVP completo`  
**Autor PR:** cescobar-stt  
**Stage:** dev  
**URLs:**
- Frontend: https://d1z7dsgvuqduin.cloudfront.net
- ServicesApi: https://5em5s6gn59.execute-api.us-east-1.amazonaws.com
- FunctionsApi: https://eibwrbqsna.execute-api.us-east-1.amazonaws.com

---

## Resultado General: ✅ APROBADO

La estrategia de chunking funciona correctamente en el deploy. Los property-based tests validan formalmente las propiedades de correctitud. Las pruebas de integración contra el deploy confirman que el pipeline produce fragmentos coherentes.

---

## Alcance del Slice 2 (Sección 2.2 del documento de solución)

Criterios de aceptación validados:
- Segmentación en fragmentos de ~800 tokens
- Overlap de ~100 tokens entre fragmentos consecutivos
- Corte en límites de párrafo (no corta párrafos a la mitad)
- Headers MD (h1-h3) como separadores naturales
- Fusión de fragmentos < 50 tokens con el adyacente
- Metadata de posición y referencia al documento fuente
- Lógica pura en `packages/core` (sin dependencias de AWS)

---

## Pruebas automatizadas (Property-Based Tests + Unit Tests)

**Comando:** `pnpm --filter @multibotagents/core exec vitest run src/knowledge/__tests__/chunking`

| Archivo | Tests | Resultado |
|---------|-------|-----------|
| `chunking.unit.test.ts` | 24 | ✅ PASS |
| `chunking.property.test.ts` | 16 | ✅ PASS |
| **Total** | **40** | **✅ 40/40 PASS** |

### Propiedades formales validadas

| # | Propiedad | Descripción | Resultado |
|---|-----------|-------------|-----------|
| P4 | Preservación de contenido (round-trip) | Toda oración del texto original aparece en al menos un chunk | ✅ PASS |
| P5 | Límites de tamaño de chunk | Todos los chunks tienen entre 50 y 900 tokens (cuando input ≥ 50 tokens) | ✅ PASS |
| P6 | Integridad de límites de párrafo | Párrafos ≤ 800 tokens no se cortan a la mitad; párrafos > 800 se cortan solo en límites de oración | ✅ PASS |
| P7 | Integridad de secciones Markdown | Secciones ≤ 800 tokens se mantienen como un solo chunk; headers h1-h3 actúan como separadores | ✅ PASS |
| P8 | Posiciones secuenciales | Posiciones forman secuencia [0, 1, ..., N-1]; cada chunk referencia el sourceId correcto | ✅ PASS |

### Unit tests detallados

| Grupo | Tests | Resultado |
|-------|-------|-----------|
| `countTokens` | 5 | ✅ (vacío, cálculo ceil(words/0.75), espacios múltiples, saltos de línea, una palabra) |
| `chunkPlainText` | 9 | ✅ (vacío, espacios, texto corto, posiciones, límites párrafo, subdivisión, fusión, tokenCount, sourceId) |
| `chunkMarkdown` | 8 | ✅ (vacío, headers h1-h3, sección completa, subdivisión, metadata sección, contenido pre-header, h4+ ignorados, posiciones) |
| `overlap` | 1 | ✅ (overlap entre chunks consecutivos) |
| `round-trip preservation` | 1 | ✅ (preserva contenido original) |

---

## Pruebas de integración contra deploy (API)

### Test 1: Texto corto (< 50 tokens) → 1 fragmento

| Campo | Detalle |
|-------|---------|
| **Input** | 134 bytes, ~25 tokens, 1 oración |
| **Resultado** | `status: "indexed"`, `fragmentCount: 1` |
| **Veredicto** | ✅ PASS — Texto bajo el mínimo se mantiene como un solo chunk |
| **Tiempo de procesamiento** | ~2.3s |

### Test 2: Texto largo 7 párrafos (~667 tokens) → 1 fragmento

| Campo | Detalle |
|-------|---------|
| **Input** | 3573 bytes, ~500 palabras, 7 párrafos |
| **Resultado** | `status: "indexed"`, `fragmentCount: 1` |
| **Veredicto** | ✅ PASS — Texto bajo el target de 800 tokens se mantiene como un solo chunk |
| **Tiempo de procesamiento** | ~0.4s |
| **Análisis** | 500 palabras / 0.75 ≈ 667 tokens < 800 target → correcto que sea 1 chunk |

### Test 3: Markdown con headers h1/h2/h3 → 5 fragmentos

| Campo | Detalle |
|-------|---------|
| **Input** | 1866 bytes, Markdown con 1 h1, 3 h2, 1 h3 |
| **Resultado** | `status: "indexed"`, `fragmentCount: 5` |
| **Veredicto** | ✅ PASS — Headers actúan como separadores naturales, cada sección es un chunk |
| **Tiempo de procesamiento** | ~0.9s |
| **Análisis** | 5 secciones delimitadas por headers → 5 chunks. Confirma que el chunking MD usa headers como separadores |

### Test 4: Texto muy largo 10 párrafos (~933 tokens) → 2 fragmentos

| Campo | Detalle |
|-------|---------|
| **Input** | 4932 bytes, ~700 palabras, 10 párrafos densos |
| **Resultado** | `status: "indexed"`, `fragmentCount: 2` |
| **Veredicto** | ✅ PASS — Texto que excede 800 tokens se divide en múltiples chunks |
| **Tiempo de procesamiento** | ~0.7s |
| **Análisis** | ~700 palabras / 0.75 ≈ 933 tokens > 800 target → se divide en 2 chunks respetando límites de párrafo |

---

## Validación de criterios de aceptación

| # | Criterio (Sección 5 del documento) | Verificado | Método |
|---|-------------------------------------|:----------:|--------|
| 1 | Documentos se segmentan en fragmentos de ~800 tokens | ✅ | PBT P5 + Test 4 (divide a >800) |
| 2 | Overlap de ~100 tokens entre fragmentos consecutivos | ✅ | PBT P4 + Unit test "overlap" |
| 3 | Corte en límites de párrafo cuando es posible | ✅ | PBT P6 + Unit test "límites de párrafo" |
| 4 | Headers MD como separadores naturales | ✅ | PBT P7 + Test 3 (5 secciones → 5 chunks) |
| 5 | Fragmentos < 50 tokens se fusionan con el siguiente | ✅ | PBT P5 (min 50) + Unit test "fusionar" |
| 6 | Metadata de posición y referencia al documento fuente | ✅ | PBT P8 + Unit tests sourceId/posición |
| 7 | Lógica en `packages/core` (sin deps AWS) | ✅ | Inspección de código — lógica pura |

---

## Análisis del código (inspección)

### Configuración por defecto verificada

```typescript
export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  targetTokens: 800,    // ✅ Conforme al requisito
  overlapTokens: 100,   // ✅ Conforme al requisito
  minTokens: 50,        // ✅ Conforme al requisito
};
```

### Aproximación de tokens

```typescript
countTokens(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.ceil(words / 0.75);  // ✅ Aproximación razonable
}
```

### Flujo de chunking para texto plano

1. Divide en párrafos (`\n\n`) ✅
2. Subdivide párrafos > 800 tokens en oraciones ✅
3. Agrupa unidades respetando targetTokens ✅
4. Fusiona chunks < 50 tokens ✅
5. Aplica overlap entre chunks consecutivos ✅
6. Asigna metadata (posición, sourceId) ✅

### Flujo de chunking para Markdown

1. Divide por headers h1-h3 ✅
2. Secciones ≤ 800 tokens → un solo chunk ✅
3. Secciones > 800 tokens → chunking por párrafos ✅
4. Fusiona secciones pequeñas ✅
5. Aplica overlap ✅
6. Asigna metadata con nombre de sección ✅

---

## Observaciones

### 🟡 OBS-1: Headers h4+ no se usan como separadores

| Campo | Detalle |
|-------|---------|
| **Severidad** | Informativa |
| **Descripción** | Solo h1 (`#`), h2 (`##`) y h3 (`###`) actúan como separadores. Headers h4+ (`####`) se tratan como texto normal dentro de la sección. |
| **Impacto** | Bajo. Es una decisión de diseño documentada. Documentos con estructura profunda (h4+) podrían producir chunks más grandes de lo ideal. |
| **Recomendación** | Documentar esta limitación para usuarios que suban Markdown con estructura profunda. |

### 🟡 OBS-2: Aproximación de tokens no es exacta

| Campo | Detalle |
|-------|---------|
| **Severidad** | Informativa |
| **Descripción** | La fórmula `ceil(words / 0.75)` es una aproximación. Los tokenizers reales (BPE) producen conteos diferentes según el idioma y vocabulario. |
| **Impacto** | Bajo. Para el propósito de chunking, la aproximación es suficiente. Los chunks resultantes están dentro del rango aceptable (50-900 tokens). |
| **Recomendación** | Aceptable para MVP. Post-MVP evaluar usar un tokenizer real si la calidad del RAG lo requiere. |

---

## Datos de prueba (limpiados)

Todos los documentos creados durante QA fueron eliminados exitosamente:
- `QA-Chunking-PlainText-Short` (134 bytes) — ELIMINADO ✅
- `QA-Chunking-LongText-7Paragraphs` (3573 bytes) — ELIMINADO ✅
- `QA-Chunking-Markdown-Headers` (1866 bytes) — ELIMINADO ✅
- `QA-Chunking-VeryLong-10Paragraphs` (4932 bytes) — ELIMINADO ✅

---

## Veredicto

**✅ APROBADO** — La estrategia de chunking cumple todos los criterios de aceptación definidos en la sección 2.2 del documento de solución.

- 40/40 tests automatizados pasan (incluyendo property-based tests con fast-check)
- 4/4 pruebas de integración contra el deploy confirman comportamiento correcto
- El código es lógica pura en `packages/core` sin dependencias de AWS
- La configuración (800 tokens target, 100 overlap, 50 mínimo) está correctamente implementada
- Los headers Markdown actúan como separadores naturales
- Los párrafos no se cortan a la mitad
- El overlap garantiza preservación de contenido en los bordes
