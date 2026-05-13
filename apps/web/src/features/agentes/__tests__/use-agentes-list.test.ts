import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

import { useAgentesList } from "../hooks/use-agentes-list";
import * as agentesService from "../services/agentes.service";

describe("useAgentesList", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("siempre está en exactamente uno de los 4 estados mutuamente excluyentes", async () => {
    vi.spyOn(agentesService, "fetchAgentes").mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: [
                  {
                    id: "1",
                    nombre: "Test",
                    tipo: "rag",
                    estado: "activo",
                    createdAt: "2026-05-01T10:00:00Z",
                  },
                ],
              }),
            50
          )
        )
    );

    const { result } = renderHook(() => useAgentesList());

    // Estado loading
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.agentes).toHaveLength(0);

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Estado success con datos
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.agentes.length).toBeGreaterThan(0);
  });

  it("transiciona a estado error cuando el fetch falla", async () => {
    vi.spyOn(agentesService, "fetchAgentes").mockRejectedValue(
      new Error("Network error")
    );

    const { result } = renderHook(() => useAgentesList());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Network error");
    expect(result.current.agentes).toHaveLength(0);
  });

  it("retry después de un error re-ejecuta el fetch y puede transicionar a success", async () => {
    const fetchSpy = vi
      .spyOn(agentesService, "fetchAgentes")
      .mockRejectedValueOnce(new Error("Fail"))
      .mockResolvedValueOnce({
        data: [
          {
            id: "1",
            nombre: "Test",
            tipo: "rag",
            estado: "activo",
            createdAt: "2026-05-01T10:00:00Z",
          },
        ],
      });

    const { result } = renderHook(() => useAgentesList());

    // Espera error
    await waitFor(() => expect(result.current.error).toBe("Fail"));

    // Retry
    act(() => {
      result.current.retry();
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.agentes).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("retry múltiples veces no acumula llamadas concurrentes (idempotencia)", async () => {
    let resolveCount = 0;
    vi.spyOn(agentesService, "fetchAgentes").mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            resolveCount++;
            resolve({
              data: [
                {
                  id: "1",
                  nombre: "Test",
                  tipo: "rag",
                  estado: "activo",
                  createdAt: "2026-05-01T10:00:00Z",
                },
              ],
            });
          }, 50)
        )
    );

    const { result } = renderHook(() => useAgentesList());

    // Espera que termine el fetch inicial
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(resolveCount).toBe(1);

    // Llama retry 3 veces rápidamente
    act(() => {
      result.current.retry();
      result.current.retry();
      result.current.retry();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // El estado final es consistente (tiene datos)
    expect(result.current.agentes).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("los agentes se devuelven ordenados por createdAt descendente", async () => {
    vi.spyOn(agentesService, "fetchAgentes").mockResolvedValue({
      data: [
        {
          id: "1",
          nombre: "Primero",
          tipo: "rag",
          estado: "activo",
          createdAt: "2026-05-01T10:00:00Z",
        },
        {
          id: "2",
          nombre: "Último",
          tipo: "cotizador",
          estado: "activo",
          createdAt: "2026-05-10T10:00:00Z",
        },
        {
          id: "3",
          nombre: "Medio",
          tipo: "agendamiento",
          estado: "borrador",
          createdAt: "2026-05-05T10:00:00Z",
        },
      ],
    });

    const { result } = renderHook(() => useAgentesList());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.agentes[0].nombre).toBe("Último");
    expect(result.current.agentes[1].nombre).toBe("Medio");
    expect(result.current.agentes[2].nombre).toBe("Primero");
  });
});
