"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Trash2 } from "lucide-react";

import { Agente } from "../types/agentes.types";

interface AgenteRowMenuProps {
  agente: Agente;
  onEliminar: (agente: Agente) => void;
}

export function AgenteRowMenu({ agente, onEliminar }: AgenteRowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-md transition-colors"
        style={{ color: "#bbcabe" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "#2f3731")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "transparent")
        }
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-label={`Acciones para ${agente.nombre}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreVertical size={16} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-lg py-1 shadow-lg"
          style={{
            backgroundColor: "#1a211c",
            border: "1px solid #3c4a41",
          }}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors text-left"
            style={{ color: "#f87171" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#2d1a1a")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
              onEliminar(agente);
            }}
          >
            <Trash2 size={14} aria-hidden="true" />
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}
