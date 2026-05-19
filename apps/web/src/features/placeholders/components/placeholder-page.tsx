import { Construction } from "lucide-react";

import { PlaceholderPageProps } from "../types/placeholders.types";

export function PlaceholderPage({ icon, title, message, children }: PlaceholderPageProps) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-8">
      {/* Icon */}
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: "#1a2f23", border: "1px solid #3c4a41" }}
      >
        <span style={{ color: "#869489" }}>{icon}</span>
      </div>

      {/* Title + Badge */}
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-2xl font-semibold" style={{ color: "#dde5dc" }}>
          {title}
        </h1>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
          style={{ border: "1px solid #3c4a41", color: "#bbcabe" }}
        >
          <Construction size={12} aria-hidden="true" />
          En desarrollo
        </span>
      </div>

      {/* Message */}
      <p
        className="max-w-md text-center text-sm leading-relaxed"
        style={{ color: "#869489" }}
      >
        {message}
      </p>

      {/* Mock estático (opcional) */}
      {children && (
        <>
          <div className="w-full max-w-2xl" style={{ borderTop: "1px solid #3c4a41" }} />
          <div className="w-full max-w-2xl" style={{ opacity: 0.65 }}>
            {children}
          </div>
        </>
      )}
    </div>
  );
}
