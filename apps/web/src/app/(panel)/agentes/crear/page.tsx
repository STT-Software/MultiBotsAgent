import { CrearAgenteForm } from "@/features/agentes/components/crear-agente-form";

export default function CrearAgentePage() {
  return (
    <div className="flex min-h-full flex-col">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#00bb7a" }}
          >
            Configuration
          </span>
          <h1
            className="mt-1 text-2xl font-bold"
            style={{ color: "#e8f0ea" }}
          >
            Nuevo Agente
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#bbcabe" }}>
            Configura la identidad básica de tu nueva entidad de IA.
          </p>
        </div>
        <span
          className="text-xs font-medium"
          style={{ color: "#869489" }}
        >
          STEP 01/01
        </span>
      </div>

      {/* Form card */}
      <div
        className="rounded-xl p-8"
        style={{
          backgroundColor: "#111d17",
          border: "1px solid #3c4a41",
        }}
      >
        <CrearAgenteForm />
      </div>
    </div>
  );
}
