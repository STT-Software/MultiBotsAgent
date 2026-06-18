# Reporte de QA — SOL-07/flujo-2.3: Manejo de Memoria en Escalamientos a Humano

**Fecha:** 2026-06-03  
**Solución:** SOL-07 — Gestión de Memoria Conversacional  
**PR:** #29 — feat(memory): implementación de memoria conversacional SOL-07  
**Autor de la PR:** jlamos-stt  
**QA ejecutado por:** Agente (automatizado) + pendiente QA humano  

---

## Resumen ejecutivo

| Métrica | Valor |
|---------|-------|
| Tests unitarios (filtrado isEscalated/operator) | 2/2 ✅ |
| Tests unitarios (refreshTTL) | 2/2 ✅ |
| Tests property-based (filtrado) | 1/1 ✅ |
| Tests property-based (inmutabilidad refreshTTL) | 1/1 ✅ |
| Tests repositorio (touchSession) | 1/1 ✅ |
| **Total tests relevantes al flujo 2.3** | **7/7 PASS** |
| Fallos | 0 |
| Bloqueantes | 0 |

---

## 1. Tests automatizados ejecutados

### 1.1 MemoryService — Filtrado de mensajes escalados (`packages/core`)

#### Unit Tests

| # | Escenario | Resultado |
|---|-----------|-----------|
| 1 | getHistory filtra mensajes con source="operator" e isEscalated=true (por defecto) | ✅ |
| 2 | getHistory incluye mensajes escalados si includeEscalated=true | ✅ |

#### Property-Based Tests

| # | Propiedad | Resultado |
|---|-----------|-----------|
| 1 | Nunca retorna mensajes con source="operator" o isEscalated=true cuando includeEscalated=false | ✅ |

### 1.2 MemoryService — refreshTTL (`packages/core`)

#### Unit Tests

| # | Escenario | Resultado |
|---|-----------|-----------|
| 1 | refreshTTL toca la sesión si existe (renueva updatedAt) | ✅ |
| 2 | refreshTTL no hace nada si la sesión no existe | ✅ |

#### Property-Based Tests

| # | Propiedad | Resultado |
|---|-----------|-----------|
| 1 | refreshTTL nunca altera los mensajes almacenados (inmutabilidad) | ✅ |

### 1.3 ChatMemoryRepository — touchSession (`packages/db`)

| # | Escenario | Resultado |
|---|-----------|-----------|
| 1 | touchSession actualiza solo el campo updatedAt | ✅ |

---

## 2. Criterios de aceptación verificados

| Criterio (del documento SOL-07) | Verificado | Método |
|--------------------------------|-----------|--------|
| getHistory() omite mensajes con isEscalated=true o source="operator" por defecto | ✅ | Unit test + PBT |
| refreshTTL reinicia la vigencia de la sesión en MongoDB | ✅ | Unit test + repo test |
| refreshTTL no altera los mensajes almacenados | ✅ | PBT inmutabilidad |
| Mensajes del operador se guardan con metadata source="operator" | ✅ | Diseño verificado en tipos |

---

## 3. Observaciones

- **Sin tests del módulo de escalamiento:** No existen tests (`.spec.ts`) en `apps/services/api-multi-bots/src/modules/escalamiento/`. Esto significa que la integración real entre el módulo de escalamiento y el MemoryService (guardar respuestas del operador, invocar refreshTTL al resolver) no está testeada de forma automatizada.
- La lógica pura (filtrado y refreshTTL) sí está cubierta robustamente con unit + PBT.
- El flag `isEscalated: true` se setea en el IncomingProcessor cuando detecta escalamiento activo — esto no tiene test unitario propio.

---

## 4. Pruebas pendientes

| # | Prueba | Requiere | Estado |
|---|--------|----------|--------|
| 1 | Escalar conversación → operador responde → devolver al agente → verificar que el agente no ve mensajes del operador | Flujo E2E con cuenta Meta | ⏳ |
| 2 | Escalar conversación → esperar tiempo largo → resolver → verificar que la sesión no expiró (refreshTTL) | MongoDB Atlas + tiempo | ⏳ |
| 3 | Verificar que getHistory con includeEscalated=true muestra todo el historial (para UI del operador) | Inbox frontend | ⏳ |

---

## 5. Veredicto

| Fase | Estado |
|------|--------|
| Tests automatizados | ✅ **APROBADO** — 7/7 pass |
| Integración escalamiento ↔ memoria | ⚠️ Sin tests de integración (gap documentado) |
| Pruebas manuales | ⏳ Pendiente (requiere cuenta Meta + escalamiento real) |

**Conclusión:** La lógica pura del manejo de memoria durante escalamientos está correctamente implementada y validada (filtrado + refreshTTL + inmutabilidad). Sin embargo, la integración entre el módulo de escalamiento y el MemoryService carece de tests automatizados — esto es un gap de cobertura que debería abordarse.
