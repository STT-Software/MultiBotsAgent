# Premortem: Conector de WhatsApp

**Fecha:** 2026-05-15
**Autor:** Felipe Lamos
**Solucion analizada:** SL05 — Conector de WhatsApp
**Encuadre:** Noviembre 2026. Han pasado 6 meses. El conector ha fallado.

---

## Razones de Fallo Identificadas

### Fallo 1: Token de WhatsApp expirado sin deteccion

**Historia:** Las primeras empresas conectaron sus numeros en junio. En agosto, Meta revoco tokens porque la empresa no completo verificacion de negocio a tiempo. Los mensajes empezaron a fallar con error 190. El health check actualizaba MongoDB pero no disparaba notificacion al panel por un bug. Las empresas se enteraron 2-3 dias despues cuando sus clientes dejaron de recibir respuestas.

**Supuesto subyacente:** El Business Token es de larga duracion y Meta avisa antes de revocarlo.

**Senales de alerta temprana:**
- No se probo el flujo de reconexion end-to-end con token real expirado.
- No hay alarma cuando el DLQ acumula mensajes por token invalido.

**Mitigacion aplicada:** Alarma en DLQ + health check que valida token Y dispara notificacion (panel + email). Test end-to-end obligatorio pre-lanzamiento.

---

### Fallo 2: Deduplicacion por ventana temporal imposible con Lambda + SQS

**Historia:** El diseno decia "agrupar mensajes del mismo usuario en ventana de 3-5 segundos". Pero Lambda + SQS no funciona asi. SQS entrega mensajes individualmente. Para implementar la ventana, la Lambda necesitaria esperar 3-5 segundos por si llegan mas mensajes. Lambda cobra por tiempo de ejecucion. El equipo intento soluciones complejas (DynamoDB como buffer, cron Lambda). La complejidad se triplico. Bugs de timing causaron mensajes duplicados y perdidos.

**Supuesto subyacente:** La deduplicacion por ventana temporal es simple con SQS.

**Senales de alerta temprana:**
- No hay PoC que demuestre la deduplicacion funcionando.
- El documento no especifica el mecanismo concreto.

**Mitigacion aplicada:** ELIMINADA la deduplicacion por ventana. Reemplazada con idempotencia por `wamid` (message ID de Meta). Cada mensaje se procesa individualmente. El Motor RAG ya soporta recibir multiples mensajes concatenados (SOL-02, flujo 2.3) — esa responsabilidad queda en el motor, no en el conector.

---

### Fallo 3: Embedded Signup como UNICO mecanismo bloqueo el desarrollo

**Historia:** Para probar el flujo end-to-end se necesitaba un numero conectado via Embedded Signup. La app de Meta no paso App Review en la primera iteracion (rechazada por documentacion insuficiente). Segunda iteracion tardo 2 semanas mas. El desarrollo se paralizo 4 semanas. No se podia probar NADA del flujo de recepcion/envio.

**Supuesto subyacente:** App Review pasa rapido y no hay necesidad de alternativa para desarrollo.

**Senales de alerta temprana:**
- No hay plan B para desarrollo local.
- El documento dice "unico mecanismo" sin excepcion para dev.

**Mitigacion aplicada:** Agregar mecanismo manual de credenciales SOLO para entornos de desarrollo/testing (no expuesto en produccion). En dev, se puede configurar Phone Number ID + Token manualmente via variables de entorno o seed de MongoDB.

---

### Fallo 4: Cache de mapeo Phone Number ID a agentId se desincronizon

**Historia:** Cache en memoria de Lambda. Cuando una empresa desconecto su numero y lo reconecto a otro agente, el cache de Lambdas activas seguia apuntando al agente anterior. Durante 10-15 minutos los mensajes llegaban al agente equivocado.

**Supuesto subyacente:** El cache en memoria es suficiente y la invalidacion no es problema.

**Senales de alerta temprana:**
- No hay mecanismo de invalidacion documentado.
- No hay test que simule reconexion con Lambda caliente.

**Mitigacion aplicada:** Cache con TTL corto (60 segundos). Al ser un lookup simple en MongoDB (indice por phoneNumberId), la latencia de query es < 5ms. No se necesita cache complejo. Si el volumen crece mucho, evaluar cache con TTL en la misma Lambda (sin servicios externos).

---

### Fallo 5: Meta envia webhooks duplicados y el sistema proceso el mismo mensaje multiples veces

**Historia:** Meta reenvia webhooks por razones internas (documentado en su API). El sistema no tenia idempotencia. Un mensaje llego 3 veces. El motor proceso las 3. El agente respondio 3 veces. En el cotizador, un pedido se confirmo 2 veces.

**Supuesto subyacente:** Si respondemos 200 rapido, Meta no reenvia.

**Senales de alerta temprana:**
- No hay deduplicacion por `wamid` antes de publicar en SQS.
- El documento no menciona idempotencia.

**Mitigacion aplicada:** Idempotencia por `wamid` en el Webhook Handler. Antes de publicar en SQS, verificar en MongoDB (coleccion `processedMessages` con TTL de 24h) si ese `wamid` ya fue procesado. Si ya existe, descartar silenciosamente.

---

### Fallo 6: Lambda no puede alcanzar NestJS por topologia de red

**Historia:** Lambda vive fuera de VPC. NestJS en Fargate detras de ALB interno (VPC privada). Lambda no puede alcanzar el endpoint. Opciones: meter Lambda en VPC (cold start +5-10s) o exponer NestJS publicamente. Eligieron VPC y el cold start subio a 8 segundos.

**Supuesto subyacente:** Lambda puede invocar NestJS "via HTTP interno" sin considerar la red.

**Senales de alerta temprana:**
- No se especifica si Lambda esta en VPC.
- No hay diagrama de red.

**Mitigacion aplicada:** Definir explicitamente: La Lambda Message Processor se despliega EN la VPC (misma subnet que Fargate) con provisioned concurrency para mitigar cold starts. Alternativa evaluada: si el cold start es inaceptable, exponer el endpoint del motor via API Gateway privado con VPC Link (sin exponer publicamente).

---

### Fallo 7: MessageLog crecio exponencialmente

**Historia:** Cada mensaje + respuesta + 3 status updates = ~5 registros por interaccion. 20 empresas x 500 conversaciones/dia = 60,000 registros/dia. En 6 meses: 10M+ documentos. Queries lentas. Status updates compitiendo con lecturas del motor.

**Supuesto subyacente:** MongoDB soporta el volumen sin estrategia de archivado.

**Senales de alerta temprana:**
- No hay TTL ni archivado para MessageLog.
- No hay estimacion de volumen.

**Mitigacion aplicada:** TTL index en MessageLog: documentos > 90 dias se eliminan automaticamente (MongoDB TTL index nativo). Para historial largo, se puede agregar un job que archive a S3 antes del TTL si se necesita en el futuro. Indices compuestos: `{ channelId, timestamp }` y `{ waMessageId }` (para idempotencia de status updates).

---

## Sintesis

### El Fallo Mas Probable
**Deduplicacion por ventana temporal** — el diseno original era inviable con la infraestructura elegida. Eliminado y reemplazado con idempotencia simple.

### El Fallo Mas Peligroso
**Token expirado sin deteccion** — una empresa pierde comunicacion con sus clientes sin saberlo durante dias.

### El Supuesto Oculto
**Topologia de red Lambda ↔ NestJS** — nadie valido que Lambda puede alcanzar Fargate. Puede agregar latencia significativa o requerir rediseno.

### Plan Revisado (cambios aplicados al documento)

| # | Cambio | Tipo |
|---|--------|------|
| 1 | Eliminar deduplicacion por ventana. Reemplazar con idempotencia por `wamid` | Simplificacion |
| 2 | Agregar mecanismo manual de credenciales para dev/testing | Desbloqueo |
| 3 | Definir topologia de red: Lambda en VPC + provisioned concurrency | Clarificacion |
| 4 | Cache con TTL corto (60s) en vez de cache complejo con invalidacion | Simplificacion |
| 5 | TTL index en MessageLog (90 dias) | Prevencion |
| 6 | Coleccion `processedMessages` con TTL para idempotencia | Robustez |
| 7 | Alarma en DLQ + test de token expirado obligatorio | Observabilidad |

### Checklist Pre-Lanzamiento

- [ ] PoC de conectividad Lambda (en VPC) → NestJS desplegada. Latencia P95 < 3s.
- [ ] Flujo de Embedded Signup probado end-to-end en staging con numero real.
- [ ] Idempotencia por `wamid` implementada y probada con webhooks duplicados simulados.
- [ ] Alarma de DLQ configurada y probada (dispara notificacion).
- [ ] Health check de token ejecutado y validado que marca "requires_reconnection" + notifica panel + email.
- [ ] Mecanismo manual de credenciales funcionando en entorno de desarrollo.
- [ ] Estimacion de volumen de MessageLog a 6 meses documentada.


---

## Premortem #2 (sobre version corregida)

**Fecha:** 2026-05-15

### Hallazgos adicionales

| # | Fallo | Severidad | Correccion aplicada |
|---|-------|-----------|---------------------|
| 1 | Orden de operaciones: "200 antes de procesar" contradice idempotencia | Alta | Corregido: 200 se responde DESPUES de HMAC + idempotencia + SQS |
| 2 | No hay flujo de reconexion definido (canal en requires_reconnection) | Alta | Agregado flujo 2.7: Reconexion de Canal |
| 3 | Diagrama ASCII decia "Deduplicacion por ventana" | Baja | Corregido en premortem #1 |
| 4 | Sin timeout de conexion a MongoDB | Media | Agregado: timeout 3s, responde 500 si no conecta |
| 5 | Health check activo puede generar falsos positivos masivos | Media | Documentado como riesgo. Recomendacion: health check pasivo (basado en errores reales de envio) |

### Estado final del documento

Tras ambos premortems, el documento es internamente consistente:
- El flujo narrativo (seccion 2) es coherente con los acceptance criteria (seccion 5)
- Los patrones de arquitectura (seccion 4) reflejan las decisiones de diseno en los flujos
- El diagrama ASCII coincide con la narrativa
- Todos los estados del canal (connected, disconnected, requires_reconnection) tienen flujo asociado
- El orden de operaciones del webhook es claro y no ambiguo
