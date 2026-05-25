export function InboxTypingIndicator() {
  return (
    <div className="flex items-start gap-1 py-1">
      <div
        className="flex items-center gap-1 rounded-lg px-3.5 py-2.5"
        style={{ backgroundColor: "#2f3731" }}
      >
        <span className="text-[11px]" style={{ color: "#869489" }}>
          escribiendo
        </span>
        <span className="flex items-center gap-0.5">
          <span
            className="h-1.5 w-1.5 rounded-full animate-bounce"
            style={{ backgroundColor: "#869489", animationDelay: "0ms" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full animate-bounce"
            style={{ backgroundColor: "#869489", animationDelay: "150ms" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full animate-bounce"
            style={{ backgroundColor: "#869489", animationDelay: "300ms" }}
          />
        </span>
      </div>
    </div>
  );
}
