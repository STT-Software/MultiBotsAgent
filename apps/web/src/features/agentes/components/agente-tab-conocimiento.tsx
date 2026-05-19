import { FileText } from "lucide-react";

export function AgenteTabConocimiento() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-xl"
        style={{ backgroundColor: "#1a2f23", border: "1px solid #3c4a41" }}
      >
        <FileText size={28} style={{ color: "#869489" }} aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-semibold" style={{ color: "#dde5dc" }}>
          Base de conocimiento
        </h3>
        <p className="text-xs max-w-sm" style={{ color: "#869489" }}>
          Gestión de documentos disponible cuando el módulo de conocimiento esté implementado
        </p>
      </div>
    </div>
  );
}
