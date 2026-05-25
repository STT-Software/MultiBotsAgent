# Premortem — SOL-06 Sistema de Base de Conocimiento

**Fecha:** 2026-05-12  
**Solución:** Sistema de Base de Conocimiento (SOL-06)  
**Iniciativa:** Plataforma de Agentes Conversacionales  
**Encuadre:** Estamos en noviembre de 2026. Han pasado 6 meses desde que implementamos el Sistema de Base de Conocimiento. Ha fallado. El Motor RAG produce respuestas de baja calidad, las empresas beta se quejan, y el equipo está considerando re-escribir la solución desde cero.

---

## Razones de Fallo

### Fallo 1: El chunking por tamaño destruye el contexto semántico

**LA HISTORIA DEL FALLO:**

Las primeras empresas beta subieron sus documentos — manuales de productos, políticas de servicio, catálogos. El chunking por tamaño de 800 tokens cortó párrafos a la mitad, separó preguntas de sus respuestas en documentos FAQ, y dividió tablas de precios en fragmentos incoherentes. El RAG recuperaba fragmentos que contenían palabras relevantes pero carecían del contexto necesario para responder correctamente. Las respuestas del agente eran parciales, confusas, o mezclaban información de secciones no relacionadas.

El equipo intentó ajustar el tamaño del chunk (600, 1000, 1200 tokens) pero el problema no era el tamaño — era que el corte no respetaba la estructura lógica del documento. Un FAQ con "Pregunta: ¿Cuál es el horario? Respuesta: Lunes a viernes de 8am a 6pm" se cortaba entre la pregunta y la respuesta.

**EL SUPUESTO SUBYACENTE:** Que el chunking por tamaño con overlap es "suficiente para el MVP" y que el overlap compensa los cortes arbitrarios.

**SEÑALES DE ALERTA TEMPRANA:**
- En las primeras pruebas con documentos reales, el RAG responde con información incompleta o mezcla datos de secciones distintas.
- Los fragmentos recuperados con score alto contienen solo la mitad de la información necesaria para responder.

---

### Fallo 2: Los PDFs de empresas reales no tienen texto limpio

**LA HISTORIA DEL FALLO:**

Las empresas beta subieron sus documentos tal como los tenían: PDFs generados desde Word con tablas complejas, PDFs escaneados de menús de restaurante, catálogos con columnas y diseño gráfico pesado. El extractor `pdf-parse` sacó texto desordenado — columnas mezcladas, texto de headers repetido, pies de página intercalados con contenido, tablas convertidas en secuencias de texto sin sentido.

Los fragmentos resultantes eran ruido. El RAG encontraba matches por palabras clave pero el contenido era incoherente. Las empresas decían "subí mi catálogo pero el agente no sabe los precios" porque la tabla de precios se extrajo como "Producto A 15.000 Producto B Descripción larga que se mezcla con la siguiente columna 22.000".

**EL SUPUESTO SUBYACENTE:** Que los PDFs de las empresas tienen "texto nativo" limpio y estructurado.

**SEÑALES DE ALERTA TEMPRANA:**
- Al probar con PDFs reales (no los de prueba del equipo), el texto extraído es ilegible o desordenado.
- Empresas de sectores como restaurantes, retail o salud suben PDFs que son esencialmente imágenes con texto superpuesto.

---

### Fallo 3: El modelo de embeddings no captura bien español coloquial ni jerga de negocio

**LA HISTORIA DEL FALLO:**

Amazon Titan Embeddings fue entrenado predominantemente en inglés. Funciona "aceptablemente" en español formal, pero las empresas beta tenían documentos con jerga local (colombianismos, términos de industria, abreviaciones). Los clientes finales escribían en lenguaje coloquial por WhatsApp ("cuánto vale la orto?" para ortodoncia, "tienen el combo familiar?" para un paquete de servicios).

La distancia semántica entre la query coloquial del usuario y el texto formal del documento era demasiado alta. El RAG no encontraba fragmentos relevantes a pesar de que la información existía. El umbral de relevancia descartaba fragmentos que sí eran relevantes pero tenían score bajo por la brecha lingüística.

**EL SUPUESTO SUBYACENTE:** Que Amazon Titan Embeddings genera vectores de calidad suficiente para español coloquial y jerga de negocio local.

**SEÑALES DE ALERTA TEMPRANA:**
- Queries en español coloquial retornan scores significativamente más bajos que queries en español formal para el mismo contenido.
- El umbral de relevancia descarta demasiados resultados legítimos.

---

### Fallo 4: La latencia de indexación frustra a los usuarios y no hay feedback útil

**LA HISTORIA DEL FALLO:**

Un admin sube un PDF de 50 páginas. La API retorna `processing`. El admin espera. Y espera. No sabe si va por la página 10 o la 45. No sabe si falló silenciosamente. Después de 3 minutos sin feedback, cierra la pestaña y vuelve a subir el mismo documento. Ahora hay dos copias procesándose. Cuando vuelve a revisar, ve el documento duplicado con fragmentos duplicados. El RAG ahora retorna el mismo fragmento dos veces con scores ligeramente distintos.

El problema no era la latencia en sí (3 minutos es aceptable) sino la falta de feedback de progreso y la ausencia de deduplicación.

**EL SUPUESTO SUBYACENTE:** Que un estado binario `processing → indexed` es suficiente feedback para el usuario.

**SEÑALES DE ALERTA TEMPRANA:**
- Usuarios suben el mismo documento múltiples veces.
- Preguntas frecuentes al soporte: "¿ya se subió mi documento?" o "lleva mucho tiempo procesando, ¿está bien?"

---

### Fallo 5: El índice vectorial no se creó correctamente o no se mantiene con los deploys

**LA HISTORIA DEL FALLO:**

El equipo implementó todo el pipeline. Funcionaba en dev. Al hacer deploy a staging, el índice `vectorSearch` no existía en el cluster de MongoDB de ese stage. Las búsquedas retornaban arrays vacíos. El Motor RAG interpretaba esto como "no hay información" y respondía con el mensaje genérico. Nadie se dio cuenta durante días porque no había monitoreo del estado del índice.

Peor aún: el índice vectorSearch en MongoDB Atlas se crea via la UI de Atlas o via API de Atlas Admin, no via el driver de MongoDB. No es un índice normal que se crea con `createIndex()`. El equipo asumió que era como cualquier otro índice y no automatizó su creación.

**EL SUPUESTO SUBYACENTE:** Que el índice vectorSearch se gestiona como cualquier otro índice de MongoDB y se crea automáticamente con el deploy.

**SEÑALES DE ALERTA TEMPRANA:**
- Búsquedas vectoriales retornan resultados vacíos en un stage donde hay fragmentos indexados.
- No hay un script o paso de verificación del índice en el pipeline de deploy.

---

### Fallo 6: El overlap de 100 tokens no es suficiente y genera fragmentos con contexto roto en los bordes

**LA HISTORIA DEL FALLO:**

El overlap de 100 tokens (~75 palabras) parecía razonable en papel. En la práctica, muchos documentos tenían párrafos de 200-300 tokens. El overlap no alcanzaba a cubrir un párrafo completo, así que los bordes de los fragmentos seguían teniendo contexto incompleto. El RAG recuperaba un fragmento que empezaba a mitad de una explicación y terminaba a mitad de otra.

El re-ranking del LLM en la SOL-02 mitigaba parcialmente (descartaba fragmentos claramente irrelevantes), pero no podía reconstruir información que estaba dividida entre dos fragmentos que no se recuperaban juntos.

**EL SUPUESTO SUBYACENTE:** Que 100 tokens de overlap son suficientes para mantener coherencia en los bordes.

**SEÑALES DE ALERTA TEMPRANA:**
- Fragmentos que empiezan o terminan a mitad de oración con frecuencia.
- El RAG necesita recuperar 2-3 fragmentos consecutivos para tener una respuesta completa.

---

### Fallo 7: La Lambda falla silenciosamente y los documentos quedan en `processing` para siempre

**LA HISTORIA DEL FALLO:**

La Lambda procesaba documentos correctamente el 95% del tiempo. Pero el 5% restante — PDFs con encoding raro, archivos con caracteres especiales en el nombre, documentos con más de 500 páginas que excedían la memoria — fallaba. El error iba a CloudWatch pero nadie lo revisaba. El `KnowledgeSource` quedaba en estado `processing` indefinidamente. El admin no recibía notificación del fallo.

La DLQ acumulaba mensajes. Nadie tenía alarma configurada. Después de semanas, un admin reportó "subí 10 documentos y solo 7 aparecen como indexados". Los otros 3 estaban muertos en `processing`.

**EL SUPUESTO SUBYACENTE:** Que la DLQ + el estado `failed` son suficientes para manejar errores sin monitoreo activo.

**SEÑALES DE ALERTA TEMPRANA:**
- Documentos en estado `processing` por más de 10 minutos sin cambio.
- Mensajes acumulándose en la DLQ sin alarma.

---

## Síntesis

### 1. El Fallo Más Probable

**Chunking por tamaño destruye contexto semántico (Fallo 1 + Fallo 6).** Es casi seguro que con documentos reales de empresas (FAQs, manuales, catálogos con tablas), el chunking por tamaño fijo va a producir fragmentos con información incompleta. El overlap de 100 tokens no compensa. Esto degrada directamente la calidad del RAG.

### 2. El Fallo Más Peligroso

**PDFs de empresas reales no tienen texto limpio (Fallo 2).** Es peligroso porque es invisible hasta que pruebas con documentos reales de clientes, no con los PDFs limpios del equipo de desarrollo. Y cuando se manifiesta, no tiene solución rápida — requiere cambiar el extractor o agregar OCR, lo cual es un cambio significativo de arquitectura y costo.

### 3. El Supuesto Oculto

**Que el MVP "funciona suficientemente bien" con datos de prueba del equipo.** El verdadero test es con documentos reales de empresas reales: PDFs mal formateados, texto en español coloquial, documentos con estructura compleja. Si solo se prueba con TXT limpios y PDFs generados por el equipo, se va a producción con una falsa sensación de calidad.

### 4. El Plan Revisado

| Cambio | Detalle |
|--------|---------|
| **Chunking mejorado para MVP** | No solo tamaño fijo. Implementar detección de párrafos completos: nunca cortar a mitad de párrafo. Si un párrafo cabe en el chunk actual, incluirlo completo. Si no cabe, cerrar el chunk y empezar uno nuevo. Para MD, cada sección bajo un header es un chunk (si cabe en el límite). |
| **Validación con documentos reales desde día 1** | Antes de dar por terminado el MVP, probar con al menos 5 documentos reales de empresas target (un FAQ, un catálogo con precios, un manual de servicios, un menú, una política). No solo con TXT de prueba. |
| **Feedback de progreso** | Agregar un campo `progress` al KnowledgeSource (ej: "extracting", "chunking", "embedding 15/42", "storing"). La Lambda actualiza el progreso. El admin puede ver en qué paso va. |
| **Timeout + notificación de fallo** | Si un documento lleva más de 5 minutos en `processing`, un job lo marca como `failed` con timeout. Alarma en DLQ. El admin ve el error. |
| **Evaluación temprana de Titan Embeddings en español** | Antes de implementar todo el pipeline, hacer un benchmark rápido: 10 queries en español coloquial contra 10 fragmentos conocidos. Medir scores. Si Titan no funciona bien, evaluar Cohere multilingual antes de avanzar. |
| **Documentar limitación de PDFs complejos** | Para el MVP, documentar explícitamente que PDFs con tablas complejas, columnas o diseño gráfico pueden no indexarse correctamente. Recomendar a las empresas subir en formato TXT o MD cuando sea posible. Post-MVP evaluar extractores más sofisticados o Textract. |
| **Script de verificación de índice vectorSearch** | Crear un script/comando que verifique que el índice existe y está activo en el cluster del stage actual. Ejecutarlo como parte del deploy o como health check. |

### 5. Checklist Pre-Lanzamiento

- [ ] Probar con al menos 5 documentos reales de empresas target (no generados por el equipo).
- [ ] Verificar que el índice vectorSearch existe y funciona en cada stage antes de marcar como listo.
- [ ] Benchmark de Titan Embeddings con queries en español coloquial — confirmar que los scores son aceptables (> 0.7 para matches obvios).
- [ ] Confirmar que documentos en `processing` por más de 5 minutos se marcan como `failed` automáticamente.
- [ ] Validar que el chunking no corta párrafos a la mitad en al menos el 90% de los casos con documentos reales.
