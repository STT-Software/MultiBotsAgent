"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Loader2, Sparkles, AlertTriangle, Plus, X, ShieldAlert } from "lucide-react";
import { Agente, UpdateAgenteDTO } from "../types/agentes.types";

interface AgenteTabPersonalidadProps {
  agente: Agente;
  editarAgente: (dto: UpdateAgenteDTO) => Promise<void>;
  saving: boolean;
  error: string | null;
  success: boolean;
  resetStatus: () => void;
}

const IDIOMAS = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "pt", label: "Portugués" },
];

const TONOS = [
  { value: "profesional", label: "Profesional", desc: "Serio, corporativo y directo." },
  { value: "empático", label: "Empático", desc: "Comprensivo, cálido y paciente." },
  { value: "persuasivo", label: "Persuasivo", desc: "Enfocado en ventas y beneficios." },
  { value: "directo", label: "Directo", desc: "Conciso y orientado al grano." },
  { value: "amigable", label: "Amigable", desc: "Alegre, conversacional y cercano." },
];

export function AgenteTabPersonalidad({
  agente,
  editarAgente,
  saving,
  error,
  success,
  resetStatus,
}: AgenteTabPersonalidadProps) {
  // Estado local para los campos configurables
  const [nombre, setNombre] = useState(agente.nombre);
  const [language, setLanguage] = useState(agente.language ?? "es");
  const [welcomeMessage, setWelcomeMessage] = useState(agente.welcomeMessage ?? "");
  const [personalityName, setPersonalityName] = useState(agente.personality?.name ?? "");
  const [personalityTone, setPersonalityTone] = useState(agente.personality?.tone ?? "profesional");
  const [personalityInstructions, setPersonalityInstructions] = useState(agente.personality?.instructions ?? "");
  const [restrictions, setRestrictions] = useState<string[]>(agente.personality?.restrictions ?? []);
  
  // Estado para la nueva restricción que se está escribiendo
  const [newRestriction, setNewRestriction] = useState("");

  // Sincronizar con el agente cuando cambia o se guarda externamente
  useEffect(() => {
    setNombre(agente.nombre);
    setLanguage(agente.language ?? "es");
    setWelcomeMessage(agente.welcomeMessage ?? "");
    setPersonalityName(agente.personality?.name ?? "");
    setPersonalityTone(agente.personality?.tone ?? "profesional");
    setPersonalityInstructions(agente.personality?.instructions ?? "");
    setRestrictions(agente.personality?.restrictions ?? []);
  }, [agente]);

  // Limpiar estados de success/error después de 3 segundos
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        resetStatus();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error, resetStatus]);

  // Agregar una restricción a la lista
  const handleAddRestriction = useCallback(() => {
    const trimmed = newRestriction.trim();
    if (trimmed && !restrictions.includes(trimmed)) {
      setRestrictions((prev) => [...prev, trimmed]);
      setNewRestriction("");
    }
  }, [newRestriction, restrictions]);

  // Eliminar una restricción
  const handleRemoveRestriction = useCallback((indexToRemove: number) => {
    setRestrictions((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  }, []);

  // Manejo de eventos de teclado en la restricción
  const handleRestrictionKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddRestriction();
    }
  }, [handleAddRestriction]);

  // Determinar si hay cambios comparado con el agente original
  const origName = agente.nombre;
  const origLanguage = agente.language ?? "es";
  const origWelcome = agente.welcomeMessage ?? "";
  const origPName = agente.personality?.name ?? "";
  const origPTone = agente.personality?.tone ?? "profesional";
  const origPInst = agente.personality?.instructions ?? "";
  const origPRest = agente.personality?.restrictions ?? [];

  const hasChanges = 
    nombre !== origName ||
    language !== origLanguage ||
    welcomeMessage !== origWelcome ||
    personalityName !== origPName ||
    personalityTone !== origPTone ||
    personalityInstructions !== origPInst ||
    JSON.stringify(restrictions) !== JSON.stringify(origPRest);

  const isValid = 
    nombre.trim().length >= 1 && 
    personalityName.trim().length >= 1 && 
    personalityInstructions.trim().length >= 1;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!hasChanges || !isValid || saving) return;

      const dto: UpdateAgenteDTO = {};
      if (nombre.trim() !== origName) dto.nombre = nombre.trim();
      if (language !== origLanguage) dto.language = language;
      if (welcomeMessage !== origWelcome) dto.welcomeMessage = welcomeMessage;
      
      // Construir la personalidad estructurada
      dto.personality = {
        name: personalityName.trim(),
        tone: personalityTone,
        instructions: personalityInstructions.trim(),
        restrictions: restrictions,
      };

      await editarAgente(dto);
    },
    [
      hasChanges,
      isValid,
      saving,
      nombre,
      language,
      welcomeMessage,
      personalityName,
      personalityTone,
      personalityInstructions,
      restrictions,
      origName,
      origLanguage,
      origWelcome,
      editarAgente,
    ]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 w-full"
    >
      {/* Columna Izquierda: Formulario Principal */}
      <div
        className="flex flex-col gap-6 overflow-hidden rounded-xl p-8"
        style={{
          background: "rgba(26, 33, 28, 0.5)",
          backdropFilter: "blur(12px)",
          border: "1px solid #3c4a41",
          boxShadow: "inset 0 0 15px rgba(0, 187, 122, 0.02), 0 0 20px rgba(0, 187, 122, 0.02)",
        }}
      >
        {/* Encabezado decorativo */}
        <div className="flex items-start gap-4 pb-4" style={{ borderBottom: "1.5px solid #3c4a41" }}>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{
              backgroundColor: "rgba(0, 187, 122, 0.1)",
              border: "1px solid rgba(0, 187, 122, 0.3)",
            }}
          >
            <Sparkles size={24} style={{ color: "#00bb7a" }} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold" style={{ color: "#e8f0ea", fontFamily: "Geist, Inter, sans-serif" }}>
              Personalidad del Agente
            </h2>
            <p className="text-xs" style={{ color: "#869489" }}>
              Moldea el comportamiento cognitivo, restricciones operativas y tono lingüístico del bot.
            </p>
          </div>
        </div>

        {/* Fila: Nombre e Idioma */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Nombre de la Personalidad */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="personality-name"
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "#869489" }}
            >
              Nombre del Bot / Identidad <span className="text-red-400">*</span>
            </label>
            <input
              id="personality-name"
              type="text"
              placeholder="Ej. Sofía, Carlos, Asistente"
              value={personalityName}
              onChange={(e) => setPersonalityName(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
              style={{
                backgroundColor: "#0e1510",
                border: "1.5px solid #3c4a41",
                color: "#dde5dc",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#00bb7a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#3c4a41")}
              disabled={saving}
            />
            {personalityName.trim().length === 0 && (
              <p className="text-[11px] text-red-400">La identidad del bot es obligatoria</p>
            )}
          </div>

          {/* Idioma de salida */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="agent-language"
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "#869489" }}
            >
              Idioma de Respuesta
            </label>
            <select
              id="agent-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
              style={{
                backgroundColor: "#0e1510",
                border: "1.5px solid #3c4a41",
                color: "#dde5dc",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#00bb7a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#3c4a41")}
              disabled={saving}
            >
              {IDIOMAS.map((idioma) => (
                <option key={idioma.value} value={idioma.value}>
                  {idioma.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tono de la personalidad */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#869489" }}>
            Tono de Comunicación
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5">
            {TONOS.map((t) => {
              const isSelected = personalityTone === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setPersonalityTone(t.value)}
                  disabled={saving}
                  className="flex flex-col text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer active:scale-98"
                  style={{
                    backgroundColor: isSelected ? "rgba(0, 187, 122, 0.08)" : "#0e1510",
                    borderColor: isSelected ? "#00bb7a" : "#3c4a41",
                    boxShadow: isSelected ? "0 0 10px rgba(0, 187, 122, 0.1)" : "none",
                  }}
                >
                  <span
                    className="text-xs font-bold mb-1"
                    style={{ color: isSelected ? "#00bb7a" : "#dde5dc" }}
                  >
                    {t.label}
                  </span>
                  <span className="text-[10px] leading-normal" style={{ color: "#869489" }}>
                    {t.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mensaje de Bienvenida */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="welcome-message"
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "#869489" }}
          >
            Mensaje de Bienvenida (Primer contacto)
          </label>
          <textarea
            id="welcome-message"
            rows={2}
            placeholder="Mensaje introductorio que el agente envía cuando un usuario inicia una conversación..."
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors resize-y"
            style={{
              backgroundColor: "#0e1510",
              border: "1.5px solid #3c4a41",
              color: "#dde5dc",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#00bb7a")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#3c4a41")}
            disabled={saving}
          />
        </div>

        {/* Instrucciones cognitivas */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="personality-instructions"
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "#869489" }}
          >
            Instrucciones de Personalidad (Directrices primarias) <span className="text-red-400">*</span>
          </label>
          <textarea
            id="personality-instructions"
            rows={6}
            placeholder="Ej. Responde siempre de forma concisa. Da prioridad a resolver las dudas técnicas sobre soporte antes de ofrecer promociones comerciales. Si desconoces la respuesta de un precio, refiérelo al cotizador."
            value={personalityInstructions}
            onChange={(e) => setPersonalityInstructions(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors resize-y font-sans leading-relaxed"
            style={{
              backgroundColor: "#0e1510",
              border: "1.5px solid #3c4a41",
              color: "#dde5dc",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#00bb7a")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#3c4a41")}
            disabled={saving}
          />
          {personalityInstructions.trim().length === 0 && (
            <p className="text-[11px] text-red-400">Las instrucciones de personalidad son obligatorias</p>
          )}
        </div>

        {/* Botón de envío y feedback */}
        <div className="flex items-center gap-4 pt-4" style={{ borderTop: "1px solid #3c4a41" }}>
          <button
            type="submit"
            disabled={!hasChanges || !isValid || saving}
            className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-150 active:scale-98"
            style={{
              backgroundColor: hasChanges && isValid && !saving ? "#00bb7a" : "#2a2e2b",
              color: hasChanges && isValid && !saving ? "#0a0a0a" : "#5a6b5e",
              cursor: hasChanges && isValid && !saving ? "pointer" : "not-allowed",
              boxShadow: hasChanges && isValid && !saving ? "0 0 15px rgba(0, 187, 122, 0.2)" : "none",
            }}
          >
            {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {saving ? "Guardando..." : "Guardar Personalidad"}
          </button>

          {/* Feedback visual de guardado */}
          {success && (
            <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#49df9a" }}>
              <CheckCircle size={15} aria-hidden="true" />
              Guardado con éxito
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
              <AlertCircle size={15} aria-hidden="true" />
              {error}
            </span>
          )}
        </div>
      </div>

      {/* Columna Derecha: Restricciones y Guías */}
      <div className="flex flex-col gap-6">
        {/* Restricciones (Chips / Tags) */}
        <div
          className="flex flex-col gap-4 rounded-xl p-6"
          style={{
            background: "rgba(26, 33, 28, 0.5)",
            backdropFilter: "blur(12px)",
            border: "1px solid #3c4a41",
            boxShadow: "inset 0 0 15px rgba(0, 187, 122, 0.02)",
          }}
        >
          <div className="flex items-start gap-3 pb-3" style={{ borderBottom: "1px solid #3c4a41" }}>
            <ShieldAlert size={20} className="mt-0.5" style={{ color: "#00bb7a" }} aria-hidden="true" />
            <div className="flex flex-col">
              <h3 className="text-sm font-bold" style={{ color: "#e8f0ea" }}>
                Restricciones
              </h3>
              <p className="text-[11px]" style={{ color: "#869489" }}>
                Fija límites estrictos que el bot no debe cruzar.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              id="new-restriction-input"
              type="text"
              placeholder="Ej. No dar opiniones políticas"
              value={newRestriction}
              onChange={(e) => setNewRestriction(e.target.value)}
              onKeyDown={handleRestrictionKeyDown}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
              style={{
                backgroundColor: "#0e1510",
                border: "1.5px solid #3c4a41",
                color: "#dde5dc",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#00bb7a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#3c4a41")}
              disabled={saving}
            />
            <button
              type="button"
              onClick={handleAddRestriction}
              disabled={saving || !newRestriction.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl transition-all cursor-pointer shrink-0"
              style={{
                backgroundColor: newRestriction.trim() ? "rgba(0, 187, 122, 0.15)" : "#202522",
                border: `1px solid ${newRestriction.trim() ? "#00bb7a" : "#3c4a41"}`,
                color: newRestriction.trim() ? "#00bb7a" : "#5a6b5e",
              }}
            >
              <Plus size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Lista de chips */}
          {restrictions.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
              {restrictions.map((restriction, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-2 px-3 py-2 rounded-lg text-xs transition-colors duration-150"
                  style={{
                    backgroundColor: "#0e1510",
                    border: "1px solid #3c4a41",
                    color: "#dde5dc",
                  }}
                >
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" style={{ color: "#d97706" }} aria-hidden="true" />
                    <span className="break-words leading-relaxed">{restriction}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRestriction(idx)}
                    disabled={saving}
                    className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-[#202522] cursor-pointer text-[#869489] hover:text-[#e8f0ea] transition-colors shrink-0"
                  >
                    <X size={10} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs italic" style={{ color: "#5a6b5e" }}>
              Ninguna restricción configurada. El agente operará libremente.
            </p>
          )}
        </div>

        {/* Card Guía */}
        <div
          className="rounded-xl p-6 border border-[#3c4a41]"
          style={{ background: "rgba(14, 21, 16, 0.3)" }}
        >
          <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#dde5dc" }}>
            Buenas Prácticas
          </h3>
          <ul className="text-xs space-y-3 leading-relaxed" style={{ color: "#869489" }}>
            <li>
              <strong style={{ color: "#00bb7a" }}>Instrucciones Claras:</strong> Escribe en segunda persona (ej. "Tú eres...") y detalla el objetivo principal del bot.
            </li>
            <li>
              <strong style={{ color: "#00bb7a" }}>Reglas Claras:</strong> Utiliza la columna de restricciones para enumerar prohibiciones tajantes (ej. no hablar de competidores).
            </li>
            <li>
              <strong style={{ color: "#00bb7a" }}>Tono Consistente:</strong> Asegúrate de que el tono seleccionado coincida con el vocabulario esperado por tu audiencia.
            </li>
          </ul>
        </div>
      </div>
    </form>
  );
}
