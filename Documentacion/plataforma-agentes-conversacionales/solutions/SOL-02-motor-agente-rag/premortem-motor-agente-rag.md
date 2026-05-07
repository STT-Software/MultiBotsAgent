# Premortem — Motor de Agente RAG

**Fecha:** 2026-05-07  
**Solución:** SOL-02 Motor de Agente RAG  
**Iniciativa:** Plataforma de Agentes Conversacionales

---

## Encuadre

Estamos en noviembre de 2026. Han pasado 6 meses desde que se diseñó y construyó el Motor de Agente RAG. El proyecto ha fallado. Los clientes empresariales que contrataron la plataforma están insatisfechos, el agente RAG no cumple expectativas, y el equipo está en modo crisis. Estamos mirando hacia atrás para entender qué salió mal.

---

## Razones de fallo identificadas

### Fallo 1: La calidad de las respuestas es inaceptable con modelos de bajo costo

Los modelos económicos de Bedrock (Titan, Haiku) no generan respuestas con la calidad conversacional que las empresas esperan. Las respuestas son genéricas, robóticas, o no siguen bien las instrucciones de personalidad.

**La historia:** Las primeras demos funcionaron bien con preguntas simples. Pero cuando los clientes reales empezaron a hacer preguntas complejas, ambiguas, o en contextos conversacionales largos, los modelos baratos fallaron. Las respuestas perdían el tono configurado, ignoraban restricciones del prompt, o daban respuestas superficiales. Las empresas dijeron "esto no suena profesional" y pidieron reembolsos.

**Supuesto subyacente:** Que modelos de bajo costo + buen prompting producen calidad conversacional aceptable para uso empresarial.

**Señales de alerta temprana:**
- En pruebas internas, las respuestas requieren más de 3 iteraciones de prompt engineering para sonar naturales.
- Las empresas en beta piden "que suene más humano" en las primeras 2 semanas.

**✅ Decisión tomada:** Para la PoC se usan modelos de bajo costo. Para producción con clientes reales se optará por modelos más capaces. El diseño agnóstico (interface `LlmProvider`) permite el cambio sin refactorizar.

---

### Fallo 2: La segmentación de la base de conocimiento produce RAG basura

La Solución 6 (Base de Conocimiento) segmenta los documentos de forma genérica. Los fragmentos recuperados son demasiado cortos, demasiado largos, o cortan en puntos incorrectos.

**La historia:** Una empresa subió su manual de 200 páginas. El sistema lo cortó en chunks de 500 tokens. Cuando un cliente preguntó "¿cuál es la política de devoluciones para productos electrónicos?", el retriever trajo fragmentos que mencionaban "devoluciones" y "electrónicos" por separado, pero ninguno contenía la política completa. El agente respondió con información parcial e incorrecta.

**Supuesto subyacente:** Que la Solución 6 entregará fragmentos bien segmentados y con embeddings de calidad.

**Señales de alerta temprana:**
- En pruebas con documentos reales, más del 30% de las respuestas son parciales o imprecisas.
- Los scores de relevancia son altos pero las respuestas no satisfacen al usuario.

**✅ Decisión tomada:** Se dejó nota CRÍTICA en la iniciativa para la Solución 6 — priorizar chunking inteligente (por secciones semánticas, no por tamaño fijo). Se agregó re-ranking post-retrieval en el Motor RAG como mitigación parcial.

---

### Fallo 3: La latencia mata la experiencia en WhatsApp

La cadena completa (búsqueda vectorial + construcción de prompt + invocación a Bedrock + respuesta) toma 15-25 segundos. En WhatsApp, el usuario no ve "escribiendo..." — simplemente espera. Después de 10 segundos piensa que no funciona y escribe de nuevo.

**La historia:** Los primeros usuarios escribían, esperaban 15 segundos, escribían de nuevo "¿hola?", y el agente procesaba ambos mensajes generando dos respuestas desfasadas. La conversación se volvía caótica.

**Supuesto subyacente:** Que la latencia total se mantiene bajo 10 segundos.

**Señales de alerta temprana:**
- P95 de latencia supera 8 segundos en las primeras pruebas de carga.
- Usuarios envían mensajes duplicados en más del 15% de las conversaciones.

**✅ Decisión tomada:** A validar en beta. Se agregó mecanismo de acknowledgment ("Dame un momento...") y deduplicación de mensajes en ráfaga como mitigación.

---

### Fallo 4: El umbral de relevancia es un arma de doble filo

Si el umbral es muy alto, el agente dice "no tengo información" demasiado seguido. Si es muy bajo, alucina basándose en fragmentos vagamente relacionados. No hay un valor "correcto" universal.

**La historia:** Se configuró un umbral de 0.7 por defecto. Una empresa de servicios legales tenía preguntas donde los fragmentos relevantes tenían scores de 0.65-0.72. El agente respondía "no tengo esa información" al 40% de las preguntas que sí podía responder. Bajaron el umbral a 0.5 y empezó a inventar respuestas.

**Supuesto subyacente:** Que un umbral numérico configurable es suficiente para controlar la calidad de las respuestas.

**Señales de alerta temprana:**
- Las empresas en beta piden cambiar el umbral más de 3 veces en la primera semana.
- La tasa de "no tengo información" supera el 30% o la tasa de respuestas incorrectas supera el 10%.

**✅ Decisión tomada:** A validar en beta. El re-ranking post-retrieval mitiga parcialmente (el LLM valida si los fragmentos realmente responden la pregunta, independientemente del score numérico).

---

### Fallo 5: La memoria temporal genera conversaciones incoherentes

La ventana de memoria crea cortes abruptos. Un usuario pregunta algo, vuelve 35 minutos después a profundizar — y el agente no recuerda nada.

**La historia:** Un cliente de una clínica dental preguntó por precios de ortodoncia a las 10:00am. A las 10:40am volvió a preguntar "¿y eso incluye las consultas de seguimiento?". El agente respondió como si nunca hubieran hablado.

**Supuesto subyacente:** Que una ventana temporal simple es suficiente para la experiencia conversacional en WhatsApp (donde las conversaciones son naturalmente asíncronas).

**Señales de alerta temprana:**
- Usuarios dicen "ya te dije eso" o "¿no te acuerdas?" en más del 10% de las conversaciones.
- Las empresas piden ventanas de memoria de 24h+.

**✅ Decisión tomada:** La memoria pertenece a la Solución 7, no al RAG. Se documentó en la iniciativa que la ventana debe ser por sesión lógica (inactividad de 2-4 horas), no por tiempo fijo corto. Alternativas documentadas: historial con resumen, memoria híbrida con hechos clave. Para la PoC, ventana por inactividad es suficiente.

---

### Fallo 6: El escalamiento a humano se convierte en un agujero negro

El agente escala correctamente, pero del otro lado no hay nadie. Las empresas pequeñas no tienen personal dedicado al inbox 24/7. El usuario queda en limbo.

**La historia:** Una empresa de 3 personas configuró su agente RAG. El agente escaló una conversación a las 11pm. No había nadie. El cliente esperó, escribió "¿hay alguien?", nada. A la mañana siguiente la empresa vio el mensaje pero el cliente ya se había ido a la competencia.

**Supuesto subyacente:** Que las empresas tendrán capacidad de atender escalamientos en tiempo razonable.

**Señales de alerta temprana:**
- Más del 50% de los escalamientos no se atienden en los primeros 30 minutos.
- Empresas preguntan "¿puedo desactivar el escalamiento?".

**✅ Decisión tomada:** A validar en beta. Para la PoC no es necesario aún. Se agregó timeout de escalamiento con retorno al agente (si no se atiende en X minutos, el agente retoma).

---

### Fallo 7: LangChain como dependencia frágil

LangChain para TypeScript es menos maduro que la versión Python. Las actualizaciones rompen APIs frecuentemente. La abstracción agrega capas de indirección que dificultan el debugging.

**La historia:** A los 3 meses, LangChain lanzó una versión major que deprecó el retriever de MongoDB Atlas. El equipo tuvo que migrar urgentemente. Durante la migración, descubrieron que el comportamiento interno del chain había cambiado sutilmente — el orden de los mensajes en el prompt era diferente.

**Supuesto subyacente:** Que LangChain TypeScript es suficientemente estable y maduro para producción.

**Señales de alerta temprana:**
- Más de 2 breaking changes en LangChain en los primeros 3 meses.
- El equipo necesita leer el código fuente de LangChain para debuggear problemas más de una vez al mes.

**✅ Decisión tomada:** Se continúa con LangChain ya que se está volviendo un estándar en la industria. La mitigación es que LangChain vive detrás de interfaces (`LlmProvider`, `VectorSearchService`), permitiendo reemplazarlo si se vuelve problemático sin afectar al motor.

---

## Síntesis

### El Fallo Más Probable

**Fallo 2 + Fallo 4: RAG de baja calidad por segmentación pobre + umbral mal calibrado.** La combinación de fragmentos mal cortados y un umbral que no se puede calibrar bien produce un agente que o dice "no sé" demasiado o responde con información incorrecta.

### El Fallo Más Peligroso

**Fallo 1: Calidad conversacional inaceptable con modelos baratos.** Si las respuestas no suenan "profesionales", todo el producto pierde valor. Mitigado con la decisión de usar modelos capaces en producción.

### El Supuesto Oculto

**Las conversaciones en WhatsApp son asíncronas por naturaleza, pero el diseño original asumía interacción síncrona.** La memoria temporal, el escalamiento sin timeout, y la falta de manejo de mensajes duplicados por latencia — todos asumían que el usuario interactúa como en un chat web. WhatsApp no funciona así.

---

## Plan Revisado (cambios aplicados al documento de solución)

| # | Cambio | Estado |
|---|--------|--------|
| 1 | Mecanismo de acknowledgment ("Dame un momento...") cuando latencia > 5s | ✅ Agregado como flujo 2.2 |
| 2 | Deduplicación de mensajes en ráfaga | ✅ Agregado como flujo 2.3 |
| 3 | Timeout de escalamiento con retorno al agente | ✅ Agregado en flujo 2.4 |
| 4 | Evaluar modelos antes de comprometerse (benchmark) | ⏳ Para beta. Modelos capaces en producción |
| 5 | Continuar con LangChain (estándar de industria) | ✅ Confirmado. Encapsulado detrás de interfaces |
| 6 | Re-ranking / validación post-retrieval | ✅ Agregado en flujo 2.1 paso 7 |
| 7 | Memoria por sesión lógica (2-4h inactividad) | ✅ Documentado en notas para Solución 7 |

---

## Checklist Pre-Lanzamiento (para Beta)

- [ ] Benchmark de calidad: 50 preguntas reales probadas con el modelo elegido. Tasa de respuestas aceptables > 85%.
- [ ] Test de latencia end-to-end: P95 < 10 segundos con carga simulada de 20 conversaciones concurrentes.
- [ ] Test de deduplicación: Enviar 3 mensajes en 5 segundos y verificar que se procesan correctamente.
- [ ] Test de escalamiento con timeout: Escalar y no atender. Verificar que el agente retoma después del timeout.
- [ ] Test de memoria asíncrona: Conversar, esperar 1 hora, continuar. Verificar que el contexto se mantiene.
- [ ] Calibración de umbral: Probar con documentos reales de al menos 2 empresas beta. Documentar el rango óptimo.
