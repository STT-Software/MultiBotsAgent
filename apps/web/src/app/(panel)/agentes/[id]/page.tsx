import { AgenteDetalleView } from "@/features/agentes/components/agente-detalle-view";

interface AgenteDetallePageProps {
  params: Promise<{ id: string }>;
}

export default async function AgenteDetallePage({ params }: AgenteDetallePageProps) {
  const { id } = await params;
  return <AgenteDetalleView id={id} />;
}
