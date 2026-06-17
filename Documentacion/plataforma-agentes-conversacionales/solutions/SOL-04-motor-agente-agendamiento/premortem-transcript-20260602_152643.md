# Transcripción del Premortem: Motor de Agente de Agendamiento (SOL-04)

- **Fecha:** 2026-06-02
- **Timestamp:** 20260602_152643
- **Estado del Plan analizado:** Revisado bajo modelo híbrido (RAG + Google Calendar Tool Calling)
- **Facilitador:** Solutions Architect

---

## 1. Contexto Inicial de la Sesión

### ¿Qué es el plan?
El **Motor de Agente de Agendamiento (SOL-04)** es un componente core diseñado para automatizar la reserva de citas y gestión del calendario mediante agentes conversacionales inteligentes (WhatsApp/Web). Su arquitectura es híbrida: utiliza **RAG** para buscar políticas estáticas (horarios de atención generales, políticas de cancelación, etc.) subidas por los comercios en documentos de texto/Excel, y **Tool Calling** en tiempo real para verificar la disponibilidad exacta de slots e insertar reservas en la API de Google Calendar y base de datos local MongoDB (`bookings`).

### ¿Para quién es / a quién afecta?
*   **Empresas/Comercios:** Pequeños y medianos negocios (clínicas, estéticas, consultorías) que vinculan su Google Calendar y confían en la IA para llenar su agenda.
*   **Clientes Finales:** Usuarios que chatean a través de WhatsApp para agendar, reprogramar o cancelar citas de manera ágil.
*   **Operadores del Sistema:** Agentes humanos de atención al cliente que supervisan la bandeja de entrada cuando la conversación se escala.

### ¿Cómo se ve el éxito?
El éxito a 6 meses se ve como una plataforma estable en producción donde miles de citas diarias son coordinadas por agentes de IA, sincronizadas instantáneamente en Google Calendar y MongoDB, sin colisiones de horarios, respetando estrictamente las políticas comerciales, y con menos del 5% de las llamadas de agendamiento escaladas a humanos por errores del sistema.

---

## 2. El Encuadre del Premortem

> [!IMPORTANT]
> **Estamos en diciembre de 2026 (6 meses en el futuro).**
> El Motor de Agente de Agendamiento ha sido un fracaso rotundo en producción. Las empresas están cancelando sus suscripciones masivamente, los call centers de soporte están saturados por quejas de clientes que perdieron citas, y hay una gran desconfianza en la precisión del bot.
>
> Miramos hacia atrás para identificar exactamente qué mató a la solución.

---

## 3. Razones del Fallo (Premortem Crudo)

1.  **Falta de sincronización en tiempo real por cambios manuales en Google Calendar (Ausencia de Webhooks):** Las empresas movieron o eliminaron eventos directamente desde la app móvil de Google Calendar, pero como no implementamos suscripción a Webhooks, el bot seguía considerando esos slots libres, causando sobre-reservas catastróficas.
2.  **Estrangulamiento de cuotas y Rate Limits en Google Calendar API:** Cada consulta de "slots libres" en un chat fluido por WhatsApp generaba llamadas dinámicas a la API de Google, superando rápidamente los límites de cuota de Google Cloud y bloqueando el funcionamiento del bot.
3.  **Desfases caóticos por Zona Horaria (Timezone Mismatch):** El sistema falló al no contemplar las diferencias de huso horario entre clientes y sedes de la empresa, agendando citas en horas equivocadas o desfasadas.
4.  **Alucinaciones e imprecisión de fechas del LLM sin confirmación de doble paso:** El LLM interpretó mal términos como "el próximo martes" o "el lunes de la otra semana", creando reservas en días erróneos porque el sistema insertaba la cita sin un paso explícito de confirmación numérica estructurada por el cliente.
5.  **Expiración y revocación silenciosa de Refresh Tokens de OAuth:** El token de acceso a Google Calendar falló silenciosamente, impidiendo registrar citas reales en la agenda del comercio mientras el bot le confirmaba falsamente al cliente que su cita estaba guardada.

---

## 4. Agentes de Profundización (Análisis de Fallos)

### Agente 1: Desincronización por cambios manuales en el Calendario
*   **La Historia del Fallo:**
    Las clínicas estéticas medianas suelen mover citas sobre la marcha desde el celular de la recepcionista. Como se dejó "fuera de alcance" la suscripción a webhooks de Google Calendar para el MVP, nuestro sistema no se enteraba de estos cambios externos. El bot seguía ofreciendo horarios que ya estaban ocupados manualmente, concretando citas duplicadas. Cuando los clientes llegaban a sus citas coordinadas por WhatsApp y encontraban que otra persona estaba en su turno, culparon a la clínica. La clínica, frustrada por el desorden en su agenda diaria, decidió desconectar el bot y cancelar la suscripción a la plataforma.
*   **Supuesto Subyacente:**
    Se supuso que los comercios gestionarían su agenda de forma exclusiva a través de nuestra plataforma, o que las colisiones por cambios externos manuales serían mínimas.
*   **Señales de Alerta Temprana:**
    1.  Quejas recurrentes en soporte técnico sobre reservas encabalgadas.
    2.  Discrepancias acumulativas entre los registros de la colección `bookings` en MongoDB y los eventos reales en Google Calendar.

### Agente 2: Bloqueo por límites de cuota (Rate Limits)
*   **La Historia del Fallo:**
    Al desplegar a producción con más de 100 agentes activos, el tráfico concurrente de WhatsApp explotó. Como cada interacción de "buscar horarios" requería llamar en tiempo real a la API de Google, superamos las cuotas permitidas. Google Cloud bloqueó la API con errores `429 Too Many Requests`. Al no poder resolver la llamada a la herramienta `check_availability`, el LLM comenzó a alucinar que no había horarios libres en todo el mes, o arrojaba el mensaje de error de la plataforma escalando la conversación a un operador. Los humanos se vieron inundados de chats que el bot no pudo procesar.
*   **Supuesto Subyacente:**
    Las cuotas gratuitas o estándar de Google Calendar API serían suficientes para soportar llamadas HTTP directas por cada turno conversacional en tiempo real.
*   **Señales de Alerta Temprana:**
    1.  Aparición de errores HTTP 429 en los logs del servicio `ApiMultiBots`.
    2.  Picos inusuales en el tiempo de respuesta del bot durante flujos de agenda.

### Agente 3: Desajuste de Husos Horarios (Timezones)
*   **La Historia del Fallo:**
    La plataforma asumió que guardar todo en UTC era suficiente. Sin embargo, cuando empresas en Ciudad de México comenzaron a atender clientes de Cancún o Miami, los desajustes horarias se hicieron críticos. El bot no mapeaba explícitamente la zona horaria del cliente ni de la sede, agendando citas en Google Calendar a horas no laborables o con diferencias de 1 a 3 horas respecto a lo que el cliente acordó en su WhatsApp. Las inasistencias aumentaron drásticamente debido a recordatorios enviados a horas incorrectas.
*   **Supuesto Subyacente:**
    Tanto los comercios como sus clientes operarían en la misma zona horaria, o las librerías estándar resolverían el huso horario local de manera implícita sin configuración detallada.
*   **Señales de Alerta Temprana:**
    1.  Reclamaciones de clientes sobre recordatorios recibidos en horas de la madrugada o con desfase horario.
    2.  Registros de fecha y hora guardados en base de datos que difieren del calendario de Google por desfases exactos de 1, 2 o 3 horas.

### Agente 4: Alucinación de fechas en lenguaje natural
*   **La Historia del Fallo:**
    A pesar de inyectarle la fecha del sistema, el LLM sufría de imprecisiones ante expresiones como "el próximo viernes" dichas un jueves por la noche. Al no existir un flujo de doble confirmación numérica (ej: enviar un mensaje diciendo *"¿Confirmas tu reserva para el Viernes 12 de Junio a las 10:00 AM? Responde SÍ o NO"*), el bot llamaba inmediatamente a `book_appointment` e insertaba la cita en la fecha interpretada erróneamente. El cliente recibía una confirmación vaga y la empresa veía bloqueada una fecha equivocada en su agenda.
*   **Supuesto Subyacente:**
    El LLM interpretaría la fecha y hora relativas con 100% de precisión en español basándose únicamente en el timestamp inyectado en el System Prompt.
*   **Señales de Alerta Temprana:**
    1.  Mensajes de usuarios en los logs del chat intentando corregir al bot tras la confirmación de la cita (ej. *"No, te dije para la otra semana"*).
    2.  Citas creadas en el pasado o en fechas lejanas incoherentes.

### Agente 5: Expiración silenciosa de Refresh Tokens
*   **La Historia del Fallo:**
    Pasados 7 días del lanzamiento, todos los comercios que vincularon sus calendarios empezaron a fallar. Al estar la aplicación de Google OAuth en modo "Testing" o no haber gestionado adecuadamente las revocaciones del refresh token, los accesos expiraron silenciosamente. El backend no podía insertar eventos en Google Calendar, pero como los errores no se propagaban adecuadamente, el bot seguía guardando las reservas localmente en MongoDB y enviando confirmaciones exitosas a los clientes de WhatsApp. Los comercios abrieron sus locales por la mañana y no tenían anotado a ningún cliente en su agenda oficial de Google Calendar.
*   **Supuesto Subyacente:**
    El `refresh_token` duraría indefinidamente una vez que el usuario completaba el flujo de vinculación OAuth en el frontend.
*   **Señales de Alerta Temprana:**
    1.  Erros en logs con código `invalid_grant` o tokens de Google sin capacidad de renovación automática.
    2.  Registros creados en la base de datos `bookings` que no tienen un evento real equivalente en Google Calendar.

---

## 5. Síntesis y Plan de Acción Revisado

### El Fallo Más Probable
El **Fallo por Expiración Silenciosa del Refresh Token** y la **Falta de Sincronización en Tiempo Real (Ausencia de Webhooks)**. Son fallos garantizados a los pocos días de uso si el usuario edita su calendario manualmente o expira la sesión de Google OAuth.

### El Fallo Más Peligroso
La **Desincronización de Disponibilidad (Overbooking)**. Si el bot agenda a dos personas a la misma hora o interfiere con citas personales del comerciante, destruye la credibilidad del comercio y causa una baja (churn) inmediata de la plataforma.

### El Supuesto Oculto
El supuesto de que el comercio solo interactúa con el calendario a través del bot, y que el flujo de integración de Google OAuth no requiere un sistema activo de validación de salud de los tokens.

### El Plan Revisado (Cambios Concretos)

1.  **Caché de Disponibilidad y Sondeo (Polling) bajo demanda:**
    En lugar de consultar la API de Google Calendar en cada mensaje del chat, implementar una caché en memoria en MongoDB con TTL de 2 minutos para las consultas de slots libres de un agente. Al momento de confirmar la reserva, realizar una consulta fresca en tiempo real contra Google Calendar para validar que no haya colisiones de último segundo.
2.  **Flujo Obligatorio de Confirmación en Dos Pasos (Doble Confirmación):**
    Modificar el prompt y la lógica conversacional del agente de agendamiento para requerir que el bot envíe siempre una confirmación explícita con el formato de fecha estructurado (ej. *"Para confirmar: Cita el Martes 9 de Junio a las 3:00 PM. ¿Confirmas?"*). El LLM no podrá llamar a `book_appointment` hasta que el cliente haya respondido afirmativamente a este mensaje estructurado.
3.  **Monitoreo del Estado de Conexión (Health Check de OAuth):**
    Implementar un cron job diario que intente refrescar silenciosamente el token de cada agente conectado. Si falla la renovación del token de Google Calendar, el estado del agente cambiará a `disconnected` en MongoDB, deshabilitando automáticamente las herramientas de agenda del bot para evitar confirmaciones falsas, y notificando preventivamente al operador mediante la interfaz web y un correo de alerta.
4.  **Huso Horario Mandatario por Agente:**
    Añadir el campo `timezone` (ej: `America/Bogota`) en el esquema de configuración del Agente (`AgentConfig`). Toda conversión de fechas, inyección del timestamp al LLM y validación de slots en Google Calendar se realizará basándose en este huso horario explícito para evitar desfases horarias en servidores y clientes.
5.  **Detección de Cambios de Calendario al Procesar la Sesión:**
    Cada vez que se inicie un chat o el cliente mencione intenciones de agendamiento, refrescar la disponibilidad en Google Calendar para sincronizar el estado.

---

## 6. Checklist Pre-Lanzamiento (Guardias de Seguridad)

- [ ] **Verificación de Timezone:** Asegurar que el sistema inyecta en el prompt del LLM la fecha y hora convertidas a la zona horaria configurada del comercio, no la de la máquina local o de la base de datos (UTC).
- [ ] **Validación de Refresh Token OAuth:** Verificar que la API de Google Developer Console esté en modo "Production" para evitar la caducidad del refresh token a los 7 días, y comprobar que el refresco automático funcione mediante tests unitarios.
- [ ] **Manejo de Errores e Interrupción de Agendamiento:** Validar que si la API de Google Calendar retorna un error de autenticación o de cuota, el bot no guarde la reserva localmente y responda con un mensaje pidiendo paciencia o derivando a un humano.
- [ ] **Test de Doble Confirmación:** Confirmar que no hay ruta de código que invoque la herramienta `book_appointment` sin que el cliente haya aprobado previamente un mensaje de resumen explícito del día y la hora de la cita.
