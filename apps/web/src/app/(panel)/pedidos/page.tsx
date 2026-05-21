import { ShoppingCart, Zap, FileText } from "lucide-react";

import { PlaceholderPage } from "@/features/placeholders/components/placeholder-page";
import { PedidosMock } from "@/features/placeholders/components/pedidos-mock";

export default function PedidosPage() {
  return (
    <PlaceholderPage
      icon={<ShoppingCart size={32} aria-hidden="true" />}
      title="Módulo de Pedidos"
      message={
        <>
          La gestión de pedidos estará disponible cuando se implemente el{" "}
          <span style={{ color: "#00bb7a" }}>motor cotizador</span>. Estamos calibrando los protocolos de intercambio.
        </>
      }
      primaryAction={{ label: "Notificar disponibilidad", icon: <Zap size={16} aria-hidden="true" /> }}
      secondaryAction={{ label: "Ver documentación API", icon: <FileText size={16} aria-hidden="true" /> }}
    >
      <PedidosMock />
    </PlaceholderPage>
  );
}
