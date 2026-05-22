import { EscalatedConversation } from "../types/inbox.types";
import { InboxConversationItem } from "./inbox-conversation-item";

interface InboxConversationListProps {
  conversations: EscalatedConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function InboxConversationList({
  conversations,
  selectedId,
  onSelect,
}: InboxConversationListProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid #3c4a41" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "#dde5dc" }}>
          Conversaciones escaladas
        </h2>
        <span
          className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
          style={{ backgroundColor: "#00bb7a", color: "#004329" }}
        >
          {conversations.length}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => (
          <InboxConversationItem
            key={conversation.id}
            conversation={conversation}
            isSelected={selectedId === conversation.id}
            onClick={() => onSelect(conversation.id)}
          />
        ))}
      </div>
    </div>
  );
}
