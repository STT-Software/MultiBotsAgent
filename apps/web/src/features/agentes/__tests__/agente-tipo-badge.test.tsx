import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { AgenteTipoBadge } from "../components/agente-tipo-badge";

describe("AgenteTipoBadge", () => {
  it('tipo "rag" renderiza label "RAG" con colores azules', () => {
    render(<AgenteTipoBadge tipo="rag" />);

    const badge = screen.getByText("RAG");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveStyle({ backgroundColor: "#1a2f4a" });
    expect(badge).toHaveStyle({ color: "#7db8f0" });
    expect(badge).toHaveStyle({ border: "1px solid #2d4a6e" });
  });

  it('tipo "cotizador" renderiza label "Cotizador" con colores amarillos', () => {
    render(<AgenteTipoBadge tipo="cotizador" />);

    const badge = screen.getByText("Cotizador");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveStyle({ backgroundColor: "#3d2f1a" });
    expect(badge).toHaveStyle({ color: "#f0c87d" });
    expect(badge).toHaveStyle({ border: "1px solid #6e5a2d" });
  });

  it('tipo "agendamiento" renderiza label "Agendamiento" con colores púrpura', () => {
    render(<AgenteTipoBadge tipo="agendamiento" />);

    const badge = screen.getByText("Agendamiento");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveStyle({ backgroundColor: "#2f1a3d" });
    expect(badge).toHaveStyle({ color: "#c87df0" });
    expect(badge).toHaveStyle({ border: "1px solid #5a2d6e" });
  });

  it("cada tipo tiene una correspondencia visual única (propiedad de correspondencia visual-tipo)", () => {
    const { container: c1 } = render(<AgenteTipoBadge tipo="rag" />);
    const ragColor = (c1.firstElementChild as HTMLElement).style.color;

    const { container: c2 } = render(<AgenteTipoBadge tipo="cotizador" />);
    const cotizadorColor = (c2.firstElementChild as HTMLElement).style.color;

    const { container: c3 } = render(<AgenteTipoBadge tipo="agendamiento" />);
    const agendamientoColor = (c3.firstElementChild as HTMLElement).style.color;

    // Todos los colores son diferentes entre sí
    expect(ragColor).not.toBe(cotizadorColor);
    expect(ragColor).not.toBe(agendamientoColor);
    expect(cotizadorColor).not.toBe(agendamientoColor);
  });
});
