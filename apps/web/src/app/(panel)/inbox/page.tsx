import { MessageSquare } from "lucide-react";

import { PlaceholderPage } from "@/features/placeholders/components/placeholder-page";
import { InboxMock } from "@/features/placeholders/components/inbox-mock";

export default function InboxPage() {
  return (
    <PlaceholderPage
      icon={<MessageSquare size={32} aria-hidden="true" />}
      title="Inbox"
      message="El módulo de mensajería estará disponible cuando se implemente la solución de escalamiento."
    >
      <InboxMock />
    </PlaceholderPage>
  );
}
