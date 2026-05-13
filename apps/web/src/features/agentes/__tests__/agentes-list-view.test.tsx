import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";

import { AgentesListView } from "../components/agentes-list-view";
import * as agentesService from "../services/agentes.service";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AgentesListView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('el botón "Crear agente" se renderiza siempre, independientemente del estado de datos', async () => {
    vi.spyOn(agentesService, "fetchAgentes").mockResolvedValue({ data: [] });

    render(<AgentesListView />);

    // Visible durante loading
    expect(screen.getByLabelText("Crear nuevo agente")).toBeInTheDocument();

    // Visible después de cargar (estado vacío)
    await waitFor(() =>
      expect(screen.getByText("Aún no tienes agentes creados")).toBeInTheDocument()
    );
    expect(screen.getByLabelText("Crear nuevo agente")).toBeInTheDocument();
  });

  it("cuando el servicio retorna array vacío, se muestra AgentesEmptyState", async () => {
    vi.spyOn(agentesService, "fetchAgentes").mockResolvedValue({ data: [] });

    render(<AgentesListView />);

    await waitFor(() =>
      expect(screen.getByText("Aún no tienes agentes creados")).toBeInTheDocument()
    );

    expect(
      screen.getByText("Crea tu primer agente para empezar")
    ).toBeInTheDocument();
    expect(screen.getByText("Crear tu primer agente")).toBeInTheDocument();
  });

  it("cuando el servicio retorna datos, se muestra la tabla con agentes", async () => {
    vi.spyOn(agentesService, "fetchAgentes").mockResolvedValue({
      data: [
        {
          id: "1",
          nombre: "Agente Test",
          tipo: "rag",
          estado: "activo",
          createdAt: "2026-05-01T10:00:00Z",
        },
      ],
    });

    render(<AgentesListView />);

    await waitFor(() =>
      expect(screen.getByText("Agente Test")).toBeInTheDocument()
    );

    expect(screen.getByText("RAG")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("reemplazar fetchAgentes por otra implementación no requiere cambios en el componente (intercambiabilidad)", async () => {
    // Mock con implementación completamente diferente
    vi.spyOn(agentesService, "fetchAgentes").mockImplementation(async () => ({
      data: [
        {
          id: "99",
          nombre: "Agente Custom",
          tipo: "cotizador",
          estado: "borrador",
          createdAt: "2026-06-01T10:00:00Z",
        },
      ],
    }));

    render(<AgentesListView />);

    // El componente funciona sin cambios con la nueva implementación
    await waitFor(() =>
      expect(screen.getByText("Agente Custom")).toBeInTheDocument()
    );

    expect(screen.getByText("Cotizador")).toBeInTheDocument();
    expect(screen.getByText("Borrador")).toBeInTheDocument();
  });

  it("cuando el servicio falla, se muestra el estado de error", async () => {
    vi.spyOn(agentesService, "fetchAgentes").mockRejectedValue(
      new Error("Server error")
    );

    render(<AgentesListView />);

    await waitFor(() =>
      expect(
        screen.getByText("No pudimos cargar los agentes")
      ).toBeInTheDocument()
    );

    expect(screen.getByText("Reintentar")).toBeInTheDocument();
  });
});
