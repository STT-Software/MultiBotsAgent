import {
  AgentConfig,
  HistoryMessage,
  LlmPrompt,
  PersonalityConfig,
  SearchResult,
} from '@multibotagents/types';

/**
 * Construye el system prompt del agente a partir de su personalidad e idioma.
 * Incluye instrucciones de personalidad, restricciones de comportamiento,
 * idioma e instrucción anti-alucinación.
 *
 * @param personality - Configuración de personalidad del agente
 * @param language - Idioma en el que debe responder el agente
 * @returns System prompt completo como string
 *
 * Valida: Requisitos 5.1, 5.2
 */
export function buildSystemPrompt(personality: PersonalityConfig, language: string): string {
  const sections: string[] = [];

  sections.push(`Eres ${personality.name}.`);
  sections.push(`Tono: ${personality.tone}.`);

  if (personality.restrictions.length > 0) {
    const restrictionsList = personality.restrictions
      .map((r, i) => `${i + 1}. ${r}`)
      .join('\n');
    sections.push(`Restricciones:\n${restrictionsList}`);
  }

  if (personality.instructions) {
    sections.push(`Instrucciones: ${personality.instructions}`);
  }

  sections.push(`Idioma de respuesta: ${language}.`);
  sections.push('<instrucciones_criticas>');
  sections.push('1. SALUDOS: Si el mensaje del usuario es un saludo, despedida o cortesía, responde de forma amigable siguiendo tu personalidad.');
  sections.push('2. ESCALAMIENTO A HUMANO (MUY IMPORTANTE): Analiza la intención del usuario. Si el usuario pide explícitamente "hablar con un asesor", "hablar con un humano", "operador", "soporte técnico", o pide ser transferido, o de alguna manera expresa el deseo de ser atendido por una persona de soporte, DEBES responder ÚNICAMENTE con la palabra exacta: TRANSFER. No des explicaciones ni uses la información del contexto.');
  sections.push('3. INFORMACIÓN FALTANTE: Si te piden precios, horarios, o datos específicos y esa información NO está en el contexto proporcionado, responde ÚNICAMENTE con la palabra exacta: NO_INFO.');
  sections.push('4. NO INVENTES: No generes información que no esté respaldada por el contexto proporcionado. No inventes datos, enlaces o teléfonos.');
  sections.push('5. ESTILO CONVERSACIONAL (WHATSAPP): Responde de forma muy natural, humana, directa y amigable. Evita bloques de texto largos o densos. Estructura tus respuestas en párrafos breves (máximo 2 líneas por párrafo) o listas muy cortas con viñetas si es necesario. No envíes mensajes largos estilo correo electrónico.');
  sections.push('6. AJUSTE DE LONGITUD: Sé conciso y sintetiza la información. Tu respuesta debe terminar de manera natural y estar completa dentro del límite de caracteres, sin ideas truncadas o cortadas.');
  sections.push('7. TEMAS FUERA DE CONTEXTO Y SOLICITUDES IRRELEVANTES: Si el usuario realiza consultas sobre temas generales, chistes, favores personales, política, manualidades (por ejemplo, cómo hacer un avioncito de papel), preguntas de cultura general, o cualquier otro asunto que sea tonto o no esté relacionado directamente con la empresa, sus productos o sus servicios, y dicha información no se encuentre en el contexto proporcionado, responde amigablemente indicando de forma concisa que tu rol se limita a dar soporte sobre la empresa y sus servicios. En estos casos, NO respondas bajo ningún motivo con NO_INFO ni TRANSFER, simplemente manifiesta la restricción de manera cortés.');
  sections.push('8. MULTIMODALIDAD (AUDIO E IMÁGENES): Tienes la capacidad de recibir y procesar mensajes de audio e imágenes que el usuario envíe. El audio se transcribe automáticamente a texto antes de llegar a ti. En el caso de imágenes, se inyectan directamente en tu contexto visual. Puedes responder basándote en lo que se visualiza en las imágenes o lo que se dice en los audios de forma natural, haciendo referencia a ellos si es relevante (ej. "En la imagen que me enviaste...").');
  sections.push('</instrucciones_criticas>');

  return sections.join('\n\n');
}

/**
 * Construye la sección de contexto a partir de los fragmentos de búsqueda validados.
 * Cada fragmento se numera y separa claramente para facilitar la referencia del LLM.
 *
 * @param fragments - Fragmentos de búsqueda validados por re-ranking
 * @returns Sección de contexto formateada, o string vacío si no hay fragmentos
 *
 * Valida: Requisito 5.1
 */
export function buildContextSection(fragments: SearchResult[]): string {
  if (fragments.length === 0) {
    return '';
  }

  const formattedFragments = fragments
    .map((fragment, index) => `[Fragmento ${index + 1}]\n${fragment.content}`)
    .join('\n\n');

  return formattedFragments;
}

/**
 * Construye el prompt completo para enviar al LLM.
 * Mantiene el orden: system prompt → contexto → historial → mensaje del usuario.
 * Incluye instrucción anti-alucinación y restricción de longitud máxima.
 *
 * @param params - Parámetros de construcción del prompt
 * @param params.config - Configuración completa del agente
 * @param params.fragments - Fragmentos de búsqueda validados
 * @param params.history - Historial conversacional reciente
 * @param params.userMessage - Mensaje actual del usuario
 * @returns Objeto LlmPrompt estructurado listo para enviar al LLM
 *
 * Valida: Requisitos 5.1, 5.2, 5.3, 5.4
 */
export function buildFullPrompt(params: {
  config: AgentConfig;
  fragments: SearchResult[];
  history: HistoryMessage[];
  userMessage: string;
  image?: {
    base64: string;
    mimeType: string;
  };
}): LlmPrompt {
  const { config, fragments, history, userMessage, image } = params;

  const baseSystemPrompt = buildSystemPrompt(config.personality, config.language);
  const maxLengthInstruction = `Limita tu respuesta a un máximo de ${config.maxResponseLength} caracteres.`;
  const systemPrompt = `${baseSystemPrompt}\n\n${maxLengthInstruction}`;

  const context = buildContextSection(fragments);

  return {
    systemPrompt,
    context,
    history,
    userMessage,
    maxResponseLength: config.maxResponseLength,
    image,
  };
}
