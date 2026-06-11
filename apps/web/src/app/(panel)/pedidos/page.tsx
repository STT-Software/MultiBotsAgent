"use client";

import { ShoppingCart, Zap, FileText } from "lucide-react";
import { PlaceholderPage } from "@/features/placeholders/components/placeholder-page";
import { PedidosMock } from "@/features/placeholders/components/pedidos-mock";

export default function PedidosPage() {
  const handleNotify = () => {
    alert("¡Gracias! Te notificaremos por correo cuando el módulo de cotización y pedidos esté disponible.");
  };

  const handleDocs = () => {
    alert("Redirigiendo a la documentación de la API...");
  };

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
      primaryAction={{
        label: "Notificar disponibilidad",
        icon: <Zap size={16} aria-hidden="true" />,
        onClick: handleNotify
      }}
      secondaryAction={{
        label: "Ver documentación API",
        icon: <FileText size={16} aria-hidden="true" />,
        onClick: handleDocs
      }}
    >
      <PedidosMock />
    </PlaceholderPage>
  );
}
