const MOCK_LOGS = [
  {
    id: "AGENT_LOG_0129",
    title: "Initialization Sequence",
    description: "Node 'Emerald-Alpha' connected to master orchestrator...",
    time: "12:45:02",
    status: "active" as const,
  },
  {
    id: "AGENT_LOG_0130",
    title: "Neural Link Established",
    description: "Handshake successful between node and database...",
    time: "12:48:15",
    status: "completed" as const,
  },
  {
    id: "SYSTEM_PENDING",
    title: "Awaiting Messaging Protocol",
    description: "Detailed conversational data currently queued...",
    time: "--:--:--",
    status: "pending" as const,
  },
];

const STATUS_DOT: Record<string, string> = {
  active: "#00bb7a",
  completed: "#3c4a41",
  pending: "#3c4a41",
};

export function HistorialMock() {
  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{ backgroundColor: "#111916", border: "1px solid #3c4a41" }}
    >
      {MOCK_LOGS.map((log, i) => (
        <div
          key={log.id}
          className="flex items-start gap-4 px-5 py-4"
          style={{
            borderBottom: i < MOCK_LOGS.length - 1 ? "1px solid #1e2520" : "none",
            opacity: log.status === "pending" ? 0.5 : 1,
          }}
        >
          {/* Status dot */}
          <div className="mt-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: STATUS_DOT[log.status] }}
            />
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-mono uppercase tracking-wider"
                style={{ color: log.status === "active" ? "#00bb7a" : "#5a6b5e" }}
              >
                {log.id}
              </span>
              <span className="text-[11px] font-mono" style={{ color: "#5a6b5e" }}>
                {log.time}
              </span>
            </div>
            <span className="text-sm font-semibold" style={{ color: "#dde5dc" }}>
              {log.title}
            </span>
            <span className="text-xs italic" style={{ color: "#869489" }}>
              {log.description}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
