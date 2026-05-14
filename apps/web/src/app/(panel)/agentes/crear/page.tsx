import { CrearAgenteForm } from "@/features/agentes/components/crear-agente-form";

export default function CrearAgentePage() {
  return (
    <div className="flex min-h-full flex-col p-6">
      {/* Header de la página */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: "#e8f0ea" }}>
          Crear nuevo agente
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#bbcabe" }}>
          Define el nombre y tipo de tu nuevo agente. Podrás configurarlo en detalle después.
        </p>
      </div>

      {/* Formulario */}
      <CrearAgenteForm />
    </div>
  );
}
