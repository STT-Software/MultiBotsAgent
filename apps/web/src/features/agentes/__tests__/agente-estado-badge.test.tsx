import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { AgenteEstadoBadge } from "../components/agente-estado-badge";

describe("AgenteEstadoBadge", () => {
  it('estado "activo" renderiza label "Activo" con colores verdes', () => {
    render(<AgenteEstadoBadge estado="activo" />);

    const badge = screen.getByText("Activo");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveStyle({ backgroundColor: "#1a3d2f" });
    expect(badge).toHaveStyle({ color: "#7df0c8" });
    expect(badge).toHaveStyle({ border: "1px solid #2d6e5a" });
  });

  it('estado "borrador" renderiza label "Borrador" con colores grises', () => {
    render(<AgenteEstadoBadge estado="borrador" />);

    const badge = screen.getByText("Borrador");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveStyle({ backgroundColor: "#2a2e2b" });
    expect(badge).toHaveStyle({ color: "#8a9a8e" });
    expect(badge).toHaveStyle({ border: "1px solid #3c4a41" });
  });

  it("cada estado tiene una correspondencia visual única (propiedad de correspondencia visual-estado)", () => {
    const { container: c1 } = render(<AgenteEstadoBadge estado="activo" />);
    const activoColor = (c1.firstElementChild as HTMLElement).style.color;

    const { container: c2 } = render(<AgenteEstadoBadge estado="borrador" />);
    const borradorColor = (c2.firstElementChild as HTMLElement).style.color;

    // Los colores son diferentes entre sí
    expect(activoColor).not.toBe(borradorColor);
  });
});
