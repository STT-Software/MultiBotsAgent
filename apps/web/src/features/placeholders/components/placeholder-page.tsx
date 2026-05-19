import { PlaceholderPageProps } from "../types/placeholders.types";

export function PlaceholderPage({ icon, title, message, children, primaryAction, secondaryAction, footer }: PlaceholderPageProps) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 p-8">
      {/* Icon */}
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: "#1a2f23", border: "1px solid #3c4a41" }}
      >
        <span style={{ color: "#00bb7a" }}>{icon}</span>
      </div>

      {/* Title */}
      <h1
        className="text-3xl font-bold text-center"
        style={{ color: "#dde5dc", fontFamily: "Geist, Inter, sans-serif" }}
      >
        {title}
      </h1>

      {/* Message */}
      <p
        className="max-w-lg text-center text-sm leading-relaxed"
        style={{ color: "#869489" }}
      >
        {message}
      </p>

      {/* Mock content */}
      {children && (
        <div className="w-full max-w-3xl">
          {children}
        </div>
      )}

      {/* Action buttons */}
      {(primaryAction || secondaryAction) && (
        <div className="flex gap-3 flex-wrap justify-center">
          {primaryAction && (
            <button
              type="button"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{
                backgroundColor: "#00bb7a",
                color: "#0a0a0a",
                boxShadow: "0 0 15px rgba(0, 187, 122, 0.3)",
              }}
            >
              {primaryAction.icon}
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{
                backgroundColor: "transparent",
                color: "#00bb7a",
                border: "1px solid #00bb7a",
              }}
            >
              {secondaryAction.icon}
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      {footer && (
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest" style={{ color: "#5a6b5e" }}>
          {footer}
        </div>
      )}
    </div>
  );
}
