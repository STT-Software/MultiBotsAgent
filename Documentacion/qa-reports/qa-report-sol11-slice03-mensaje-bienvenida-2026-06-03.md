# Reporte de QA — SOL-11/flujo-2.3: Disparo del Mensaje de Bienvenida en Sesiones Nuevas

**Fecha:** 2026-06-03  
**Solución:** SOL-11 — Motor de Personalidad del Agente  
**PR:** #31 — feat(agents,inbox): implementar motor de personalidad, endpoints del backend y mejoras del frontend  
**Autor de la PR:** jlamos-stt  
**QA ejecutado por:** Agente (automatizado) + pendiente QA humano  

---

## Resumen ejecutivo

| Métrica | Valor |
|---------|-------|
| Tests RAG Engine (welcome message ordering) | 2/2 ✅ |
| **Total tests relevantes al flujo 2.3** | **2/2 PASS** |
| Fallos | 0 |
| Bloqueantes | 0 |

---

## 1. Tests automatizados ejecutados

### 1.1 RAG Engine — Welcome Message Ordering (`api-multi-bots`)

Property 11 del RAG Engine Service:

| # | Escenario | Resultado |
|---|-----------|-----------|
| 1 | isNewSession=true + config tiene welcomeMessage → primer mensaje es la bienvenida | ✅ |
| 2 | isNewSession=false → welcome message NO se antepone a la respuesta | ✅ |

---

## 2. Criterios de aceptación verificados

| Criterio (del documento SOL-11) | Verificado | Método |
|--------------------------------|-----------|--------|
| Mensaje de bienvenida se envía automáticamente al inicio de sesión limpia | ✅ | RAG Engine test (isNewSession=true) |
| Mensaje de bienvenida NO se envía en sesiones existentes | ✅ | RAG Engine test (isNewSession=false) |
| Se respeta el orden: [Bienvenida, Respuesta a consulta] | ✅ | Test verifica que primer mensaje es welcomeMessage |

---

## 3. Observaciones

- El disparo del mensaje de bienvenida depende de `MemoryService.isNewSession()` (SOL-07) — esta integración está cubierta por los tests de degradación graceful del RAG Engine (si isNewSession falla, el sistema sigue funcionando).
- No existe un test que valide el contenido exacto del welcomeMessage configurado vs. lo que se envía — el test solo verifica que SI hay welcomeMessage en config Y isNewSession=true, entonces el primer mensaje de la respuesta coincide con ese valor.
- La cobertura es mínima (2 tests) pero cubre los dos casos fundamentales del flujo.

---

## 4. Pruebas pendientes

| # | Prueba | Requiere | Estado |
|---|--------|----------|--------|
| 1 | Enviar primer mensaje desde WhatsApp a agente con welcomeMessage configurado → recibir bienvenida + respuesta | Cuenta Meta + canal conectado | ⏳ |
| 2 | Enviar segundo mensaje → verificar que NO recibe bienvenida otra vez | Cuenta Meta + canal conectado | ⏳ |
| 3 | Esperar expiración de sesión (TTL) → enviar mensaje → verificar que recibe bienvenida de nuevo | MongoDB Atlas + tiempo | ⏳ |
| 4 | Agente sin welcomeMessage configurado → verificar que no se envía nada extra | Cuenta Meta | ⏳ |

---

## 5. Veredicto

| Fase | Estado |
|------|--------|
| Tests automatizados | ✅ **APROBADO** — 2/2 pass |
| Pruebas manuales E2E | ⏳ Pendiente (requiere cuenta Meta) |

**Conclusión:** La lógica de disparo del mensaje de bienvenida está correctamente implementada — se envía solo en sesiones nuevas y se omite en sesiones existentes. Pruebas E2E con WhatsApp real quedan pendientes.
