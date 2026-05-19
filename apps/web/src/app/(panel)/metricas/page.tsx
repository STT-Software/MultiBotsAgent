import { BarChart3 } from "lucide-react";

import { PlaceholderPage } from "@/features/placeholders/components/placeholder-page";
import { MetricasMock } from "@/features/placeholders/components/metricas-mock";

export default function MetricasPage() {
  return (
    <PlaceholderPage
      icon={<BarChart3 size={32} aria-hidden="true" />}
      title="Métricas"
      message="Los dashboards de métricas estarán disponibles cuando se implemente la solución de analítica de próxima generación."
      primaryAction={{ label: "Notificarme al Lanzamiento" }}
    >
      <MetricasMock />
    </PlaceholderPage>
  );
}
