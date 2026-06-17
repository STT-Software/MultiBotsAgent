# Reporte QA — SL12: Sistema de Métricas y Analíticas

| Campo | Valor |
|-------|-------|
| **Solución** | SL12 — Sistema de Métricas y Analíticas |
| **PRs evaluadas** | #33, #34, #35 |
| **Fecha de pruebas** | 17 de junio de 2026 |
| **QA** | Kiro + jhon99mendoza (pruebas manuales) |
| **Entorno** | Deploy AWS stage `dev` |
| **Frontend URL** | https://d1z7dsgvuqduin.cloudfront.net |
| **Services API URL** | https://5em5s6gn59.execute-api.us-east-1.amazonaws.com |
| **Veredicto** | ⚠️ Aprobado con observaciones — Funcionalidad core operativa, 4 bugs identificados |

---

## Resumen ejecutivo

El sistema de métricas y analíticas está **parcialmente funcional** en el deploy dev. La API REST opera correctamente y retorna datos coherentes. El dashboard frontend carga y renderiza métricas históricas para la mayoría de filtros. Sin embargo, el bloque de actividad en tiempo real (WebSocket) no emite eventos al cliente y hay inconsistencias en la emisión de eventos de conversación.

**Resultado global: 15/16 tests de API pasan. 3/5 pruebas de frontend pasan completamente, 2 parciales.**

---

## Pruebas de API (automatizadas contra deploy)

### Autenticación y seguridad

| # | Endpoint | Sin Token | Token Falso | Esperado | Resultado |
|---|----------|-----------|-------------|----------|-----------|
| 1 | `GET /metricas/generales?period=7d` | 401 | 401 | 401 | ✅ |
| 2 | `POST /metricas/seed` | 401 | — | 401 | ✅ |
| 3 | `GET /orders` | 401 | — | 401 | ✅ |
| 4 | `POST /auth/register` (sin CAPTCHA) | 403 | — | 403 | ✅ |

### Métricas generales (con JWT válido)

| # | Test | Esperado | Obtenido | Resultado |
|---|------|----------|----------|-----------|
| 5 | `GET /metricas/generales?period=7d` | 200 + GeneralMetricsDto | 200 `{totalConversations:0, totalEscalations:2, ...}` | ✅ |
| 6 | `GET /metricas/generales?period=24h` | 200 + ceros o datos | 200 `{totalConversations:0, totalEscalations:2, ...}` | ✅ |
| 7 | `GET /metricas/generales?period=30d` | 200 + datos seed | 200 `{totalConversations:16, resolutionRate:0.1875, topTopics:[...]}` | ✅ |
| 8 | `GET /metricas/generales` (sin period) | 200 con default 7d | 200 `{period:"7d", ...}` | ✅ |
| 9 | `GET /metricas/generales?period=invalid` | **400** | **200** (acepta cualquier string) | ❌ **BUG-001** |

### Métricas por tipo de agente

| # | Test | Esperado | Obtenido | Resultado |
|---|------|----------|----------|-----------|
| 10 | `GET /metricas/tipo/rag?period=30d` | 200 + AgentMetricsDto RAG | 200 `{noAnswerCount:1, topTopics:[...], successRate:0}` | ✅ |
| 11 | `GET /metricas/tipo/cotizador?period=30d` | 200 + AgentMetricsDto Cotizador | 200 `{ordersConfirmed:2, conversionRate:0.28, successRate:0.4}` | ✅ |
| 12 | `GET /metricas/tipo/agendamiento?period=30d` | 200 + AgentMetricsDto Agendamiento | 200 `{appointmentsScheduled:1, peakHours:[...], successRate:0.125}` | ✅ |
| 13 | `GET /metricas/tipo/invalido?period=7d` | 400 | 400 | ✅ |
| 14 | `GET /metricas/agente/000000000000000000000000` | 200 + DTO vacío (successRate:0) | 200 `{successRate:0}` | ✅ |

### Seed y Orders

| # | Test | Esperado | Obtenido | Resultado |
|---|------|----------|----------|-----------|
| 15 | `POST /metricas/seed` (segunda ejecución) | 201 `{skipped:true}` | 201 `{skipped:true}` | ✅ |
| 16 | `GET /orders` | 200 + array | 200 `[]` | ✅ |

---

## Pruebas de Frontend (manuales)

### Prueba 1: Carga de la página /metricas

| Aspecto | Resultado |
|---------|-----------|
| Título "Métricas y Analíticas" visible | ✅ |
| Bloque EN VIVO con contadores | ✅ (renderiza, pero muestra 0) |
| Gráfico de Métricas en Vivo (SVG) | ✅ |
| Gráfico de Consumo Acumulado de Tokens (SVG) | ✅ |
| Tokens simulados incrementan automáticamente | ✅ |
| Actividad Reciente visible | ✅ ("Sin actividad reciente") |
| Bloque HISTÓRICO con selectores | ✅ |
| No muestra el placeholder anterior | ✅ |
| Sin errores de la aplicación en Console | ✅ (solo MobX de extensión) |

**Resultado: ✅ PASS**

### Prueba 2: Conexión WebSocket

| Aspecto | Resultado |
|---------|-----------|
| Socket.io se conecta al servidor | ✅ (via HTTP long polling) |
| JWT es aceptado (no 401) | ✅ |
| Upgrade a WebSocket real (101) | ❌ (API Gateway no soporta WS) |
| Servidor emite eventos `metrics.live_update` | ❌ (gateway preparado pero no invocado) |
| Contadores EN VIVO se actualizan con eventos reales | ❌ |

**Resultado: ⚠️ PARCIAL — Conexión establecida pero sin emisión de eventos**

### Prueba 3: Selector de período y tipo de agente

| Filtro | 24h | 7d | 30d |
|--------|-----|-----|------|
| **Todos** | Datos parciales (escalamientos) | 0 conversaciones | ✅ 16 conversaciones, tasa 19%, top temas |
| **RAG** | Sin actividad | Sin actividad | ❌ "Sin actividad" (API sí retorna datos) |
| **Cotizador** | — | — | ✅ Tasa éxito 40%, conversión 29%, pedidos 2/2 |
| **Agendamiento** | — | — | ✅ Tasa éxito 13%, citas 1, canceladas 1, horarios pico |

**Resultado: ⚠️ PARCIAL — Falla específicamente para filtro RAG**

### Prueba 4: Gráficos SVG (PR #35)

| Aspecto | Resultado |
|---------|-----------|
| Gráfico de evolución en vivo renderiza | ✅ |
| Líneas de Resueltas/Activas/Escalamientos visibles | ✅ |
| Gráfico de tokens renderiza | ✅ |
| Cards Total/Prompt/Completion con valores | ✅ |
| Costo estimado USD visible | ✅ |
| Valores incrementan periódicamente | ✅ |

**Resultado: ✅ PASS**

### Prueba 5: Cierre y reconexión de conexión al navegar

| Paso | Observación | Resultado |
|------|-------------|-----------|
| En /metricas | Polling socket.io activo | ✅ |
| Navegar a /agentes | Polling se detiene, no hay nuevos requests | ✅ |
| Volver a /metricas | Nueva conexión + nueva query REST | ✅ |

**Resultado: ✅ PASS**

---

## Bugs encontrados

### BUG-001 — Validación de `period` no se aplica

| Campo | Detalle |
|-------|---------|
| **Severidad** | Baja |
| **Endpoint** | `GET /metricas/generales?period=<cualquier_string>` |
| **Reproducción** | Enviar `period=invalid` o `period=abc` con JWT válido |
| **Esperado** | 400 con mensaje "El parámetro period debe ser '24h', '7d' o '30d'" |
| **Obtenido** | 200 — acepta el string y calcula métricas sin filtro de fecha (retorna todo el histórico) |
| **Causa probable** | El `PeriodQueryDto` tiene `@IsIn(['24h', '7d', '30d'])` pero el `ValidationPipe` global no está habilitado o el pipe no se aplica en este controller |
| **Impacto** | Un consumidor de la API puede obtener todas las métricas sin ventana temporal |

---

### BUG-002 — Contadores EN VIVO siempre en 0

| Campo | Detalle |
|-------|---------|
| **Severidad** | Alta |
| **Componente** | Dashboard /metricas → bloque "EN VIVO" |
| **Reproducción** | Navegar a /metricas con actividad reciente (escalamientos hoy: 2) |
| **Esperado** | Contadores reflejan actividad real (ej: Escalamientos Abiertos: 2) |
| **Obtenido** | Resueltas Hoy: 0, Activas Ahora: 0, Escalamientos Abiertos: 0 |
| **Causa raíz** | El `MetricasWsGateway` tiene la función `emitToCompany()` preparada pero **nadie la invoca**. El `MetricasListenerService` persiste el evento en MongoDB pero no llama al gateway para re-emitir al frontend. El propio código comenta: "El envío real de eventos en vivo se implementa en el Slice 4" |
| **Impacto** | El monitoreo en tiempo real no funciona — los usuarios no ven actividad en vivo |

---

### BUG-003 — `totalConversations` siempre 0 en períodos recientes

| Campo | Detalle |
|-------|---------|
| **Severidad** | Media |
| **Endpoint** | `GET /metricas/generales?period=24h` y `period=7d` |
| **Reproducción** | Consultar métricas generales con period=24h teniendo escalamientos activos |
| **Esperado** | `totalConversations > 0` (incluye `conversation.completed` + `conversation.escalated`) |
| **Obtenido** | `totalConversations: 0` pero `totalEscalations: 2` |
| **Causa raíz** | El `rag-engine.service.ts` y `escalamiento.service.ts` emiten `escalation.opened` y `escalation.resolved` pero **nunca emiten** los eventos `conversation.completed` ni `conversation.escalated`. Estos son los eventos que alimentan el cálculo de `totalConversations` |
| **Impacto** | Las tasas de resolución y escalamiento se calculan incorrectamente (denominador = 0) |

---

### BUG-004 — Filtro RAG muestra "Sin actividad" cuando hay datos

| Campo | Detalle |
|-------|---------|
| **Severidad** | Media |
| **Componente** | Dashboard /metricas → HISTÓRICO → filtro "RAG" + 30 días |
| **Reproducción** | Seleccionar RAG + 30 días en el bloque histórico |
| **Esperado** | Mostrar cards con noAnswerCount: 1, topTopics, successRate |
| **Obtenido** | "Sin actividad en este período" |
| **API retorna** | `{"noAnswerCount":1,"topTopics":[{"topic":"soporte_tecnico","count":1}],"successRate":0}` |
| **Causa probable** | El componente frontend de métricas RAG evalúa una condición de "empty state" que no reconoce `noAnswerCount > 0` ni `topTopics.length > 0` como datos válidos. Probablemente solo verifica `successRate > 0` o un campo inexistente como `totalConversations` |
| **Impacto** | Las métricas específicas del agente RAG nunca se visualizan |

---

## Criterios de aceptación — Verificación

### ✅ Cumplidos

- [x] API retorna métricas generales para períodos 24h, 7d, 30d
- [x] API retorna top temas RAG
- [x] API retorna tiempo promedio resolución escalamientos
- [x] Resultados filtrados por companyId (JWT)
- [x] Sin datos → retorna ceros (no error)
- [x] API retorna métricas Cotizador: orders, conversión, éxito
- [x] API retorna métricas Agendamiento: citas, peakHours, éxito
- [x] API retorna métricas RAG: noAnswer, topTopics
- [x] agentType inválido → 400
- [x] Seed endpoint idempotente
- [x] Guard JWT protege todos los endpoints
- [x] Módulo NestJS independiente (MetricasModule)
- [x] Sección Métricas reemplaza placeholder
- [x] Selector de período funciona
- [x] Selector de agente funciona (parcial — RAG falla)
- [x] Cambiar período/agente no interrumpe bloque en vivo
- [x] Al navegar fuera, cierra conexión; al volver, reconecta

### ❌ No cumplidos

- [ ] **Contadores en vivo reflejan actividad real** (BUG-002)
- [ ] **Feed de actividad se actualiza automáticamente** (BUG-002)
- [ ] **Validación de period → 400 para valores inválidos** (BUG-001)
- [ ] **Indicador de "reconectando" cuando WS se pierde** (no se puede probar — WS no hace upgrade)
- [ ] **Filtro RAG muestra datos** (BUG-004)

### ⚠️ Parcialmente cumplidos

- [ ] Los motores emiten eventos de conversación (solo emiten escalation.*, no conversation.*) (BUG-003)

---

## Recomendaciones

1. **Prioridad Alta — BUG-002:** Implementar la invocación de `emitToCompany()` desde el `MetricasListenerService` cuando se persiste un evento. Sin esto, toda la feature de "actividad en vivo" es no funcional.

2. **Prioridad Alta — BUG-003:** Agregar emisión de `conversation.completed` y `conversation.escalated` en el `rag-engine.service.ts` al finalizar el procesamiento de un mensaje. Sin esto, `totalConversations` siempre será 0.

3. **Prioridad Media — BUG-004:** Revisar la condición de "empty state" en el componente de métricas RAG del frontend. Probablemente falta evaluar `noAnswerCount > 0 || topTopics.length > 0`.

4. **Prioridad Baja — BUG-001:** Habilitar `ValidationPipe` global en el AppModule o verificar que el `@UsePipes()` esté aplicado en el controller de métricas.

5. **WebSocket en producción:** Considerar usar API Gateway WebSocket (separado del HTTP API) o exponer el servicio NestJS directamente con ALB que sí soporta WebSocket upgrade.

---

## Notas adicionales

- Los datos del seed (52 eventos) se distribuyeron en los últimos 30 días — por eso los datos aparecen en period=30d pero no en 7d/24h
- Los escalamientos recientes (2 de hoy) sí se persisten correctamente como `escalation.opened`
- El frontend de tokens (PR #35) usa valores **simulados** que se incrementan automáticamente — no son datos reales del backend
- La página de Agentes muestra correctamente 3 agentes activos, Token Usage 86.1K, Latencia 310ms
