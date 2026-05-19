import { Clock, RefreshCw, FileText } from "lucide-react";

import { PlaceholderPage } from "@/features/placeholders/components/placeholder-page";
import { HistorialMock } from "@/features/placeholders/components/historial-mock";

export default function HistorialPage() {
  return (
    <PlaceholderPage
      icon={<Clock size={32} aria-hidden="true" />}
      title="Historial"
      message="El historial de conversaciones estará disponible cuando se implementen los módulos de mensajería y métricas."
      primaryAction={{ label: "Verificar Estado", icon: <RefreshCw size={16} aria-hidden="true" /> }}
      secondaryAction={{ label: "Documentación", icon: <FileText size={16} aria-hidden="true" /> }}
    >
      <HistorialMock />
    </PlaceholderPage>
  );
}
