"use client";

import { useMemo } from "react";
import { X, FileText } from "lucide-react";

interface InboxFilePreviewProps {
  file: File;
  onRemove: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function InboxFilePreview({ file, onRemove }: InboxFilePreviewProps) {
  const isImage = file.type.startsWith("image/");
  const previewUrl = useMemo(() => {
    if (isImage) return URL.createObjectURL(file);
    return null;
  }, [file, isImage]);

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2"
      style={{ backgroundColor: "#242c27", border: "1px solid #3c4a41" }}
    >
      {/* Preview */}
      {isImage && previewUrl ? (
        <img
          src={previewUrl}
          alt={file.name}
          className="h-10 w-10 rounded object-cover"
        />
      ) : (
        <div
          className="flex h-10 w-10 items-center justify-center rounded"
          style={{ backgroundColor: "#1a2f23", border: "1px solid #3c4a41" }}
        >
          <FileText size={18} style={{ color: "#869489" }} aria-hidden="true" />
        </div>
      )}

      {/* Info */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <span className="text-xs font-medium truncate" style={{ color: "#dde5dc" }}>
          {file.name}
        </span>
        <span className="text-[10px]" style={{ color: "#869489" }}>
          {formatFileSize(file.size)}
        </span>
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors"
        style={{ color: "#869489" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2d1a1a")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        aria-label="Remover archivo"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
