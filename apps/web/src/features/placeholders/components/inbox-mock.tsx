import { MessageSquare, CheckCircle, Bell } from "lucide-react";

export function InboxMock() {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-8 w-full">
      {/* Left: message skeletons */}
      <div className="flex flex-col gap-3 flex-1 max-w-md">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl px-4 py-3.5"
            style={{
              backgroundColor: "#111916",
              border: "1px solid #3c4a41",
              opacity: 1 - i * 0.15,
            }}
          >
            {/* Avatar skeleton */}
            <div
              className="h-8 w-8 shrink-0 rounded-full"
              style={{ backgroundColor: i === 2 ? "#00bb7a" : "#2f3731" }}
            />
            {/* Text skeletons */}
            <div className="flex flex-col gap-1.5 flex-1">
              <div
                className="h-2.5 rounded"
                style={{
                  backgroundColor: i === 2 ? "#00bb7a" : "#2f3731",
                  width: i === 1 ? "60%" : i === 2 ? "50%" : "45%",
                  opacity: i === 2 ? 0.6 : 1,
                }}
              />
              <div
                className="h-2 rounded"
                style={{
                  backgroundColor: "#2f3731",
                  width: "80%",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Right: content */}
      <div className="flex flex-col gap-4 flex-1 max-w-sm">
        {/* Icon */}
        <div
          className="flex h-14 w-14 items-center justify-center rounded-xl"
          style={{ backgroundColor: "#1a2f23", border: "1px solid #3c4a41" }}
        >
          <MessageSquare size={28} style={{ color: "#00bb7a" }} aria-hidden="true" />
        </div>

        {/* Title */}
        <h2
          className="text-2xl font-bold"
          style={{ color: "#dde5dc", fontFamily: "Geist, Inter, sans-serif" }}
        >
          Inbox
        </h2>

        {/* Description */}
        <p className="text-sm leading-relaxed" style={{ color: "#869489" }}>
          El módulo de mensajería estará disponible cuando se implemente la solución de escalamiento.
        </p>

        {/* Buttons */}
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{
              backgroundColor: "#00bb7a",
              color: "#0a0a0a",
            }}
          >
            <CheckCircle size={16} aria-hidden="true" />
            Revisar Roadmap
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{
              backgroundColor: "transparent",
              color: "#00bb7a",
              border: "1px solid #00bb7a",
            }}
          >
            <Bell size={16} aria-hidden="true" />
            Notificarme
          </button>
        </div>

        {/* Status footer */}
        <div className="flex items-center gap-2 mt-4">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#5a6b5e" }} />
          <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color: "#5a6b5e" }}>
            Status: Pending Migration
          </span>
        </div>
      </div>
    </div>
  );
}
