import { ShoppingCart } from "lucide-react";

import { PlaceholderPage } from "@/features/placeholders/components/placeholder-page";
import { PedidosMock } from "@/features/placeholders/components/pedidos-mock";

export default function PedidosPage() {
  return (
    <PlaceholderPage
      icon={<ShoppingCart size={32} aria-hidden="true" />}
      title="Pedidos"
      message="La gestión de pedidos estará disponible cuando se implemente el motor cotizador."
    >
      <PedidosMock />
    </PlaceholderPage>
  );
}
