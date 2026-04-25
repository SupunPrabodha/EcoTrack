import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { api } = vi.hoisted(() => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../api/client", () => ({
  api,
}));

vi.mock("../auth/useAuth", () => ({
  useAuth: () => ({ user: { email: "user@example.com", role: "user" }, logout: vi.fn() }),
}));

import Recommendations from "./Recommendations";

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/recommendations"]}>
        <Recommendations />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Recommendations page", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();

    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  });

  it("renders generated tips and weather context", async () => {
    api.get.mockImplementation(async (url) => {
      if (url === "/recommendations/generate") {
        return {
          data: {
            data: {
              weather: { city: "Colombo", tempC: 30, condition: "Clear" },
              tips: [
                {
                  ruleId: "car_reduce",
                  title: "Cut down car travel",
                  body: "Try public transport for 1–2 trips.",
                  impact: "High",
                  estimatedKgSaved: 5,
                  confidence: "medium",
                  why: ["Car travel is high in the selected range."],
                },
              ],
              evidence: { habits: { car_km: { totalValue: 80, totalKg: 100 } } },
            },
          },
        };
      }

      if (url === "/recommendations") {
        return {
          data: {
            success: true,
            data: { items: [], total: 0, page: 1, limit: 6, pages: 1 },
            meta: { page: 1, pages: 1, total: 0 },
          },
        };
      }

      throw new Error(`Unexpected GET ${url}`);
    });

    renderPage();

    expect(await screen.findByText("Cut down car travel")).toBeInTheDocument();
    expect(screen.getByText(/Colombo\s+—\s+30°C/i)).toBeInTheDocument();
    expect(screen.getByText(/Condition:\s*Clear/i)).toBeInTheDocument();

    expect(screen.getByText(/No saved recommendations yet\./i)).toBeInTheDocument();
  });

  it("posts a saved recommendation when clicking Save", async () => {
    api.get.mockImplementation(async (url) => {
      if (url === "/recommendations/generate") {
        return {
          data: {
            data: {
              weather: { city: "Colombo", tempC: 30, condition: "Clear" },
              tips: [
                {
                  ruleId: "car_reduce",
                  title: "Cut down car travel",
                  body: "Try public transport for 1–2 trips.",
                  impact: "High",
                  estimatedKgSaved: 5,
                  confidence: "medium",
                  why: ["Car travel is high in the selected range."],
                },
              ],
              evidence: { habits: { car_km: { totalValue: 80, totalKg: 100 } } },
            },
          },
        };
      }

      if (url === "/recommendations") {
        return {
          data: {
            success: true,
            data: { items: [], total: 0, page: 1, limit: 6, pages: 1 },
            meta: { page: 1, pages: 1, total: 0 },
          },
        };
      }

      throw new Error(`Unexpected GET ${url}`);
    });

    // Keep the promise pending to avoid success-timer state updates during test cleanup.
    api.post.mockImplementation(() => new Promise(() => {}));

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Cut down car travel")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));

    const [url, body] = api.post.mock.calls[0];
    expect(url).toBe("/recommendations");
    expect(body).toEqual(
      expect.objectContaining({
        ruleId: "car_reduce",
        title: "Cut down car travel",
        impact: "High",
        context: expect.any(Object),
        evidence: expect.any(Object),
      })
    );
  });

  it("calls the PDF report endpoint when clicking Download PDF report", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/recommendations/report") return new Promise(() => {});

      if (url === "/recommendations/generate") {
        return Promise.resolve({
          data: {
            data: {
              weather: null,
              tips: [],
              evidence: { habits: {} },
            },
          },
        });
      }

      if (url === "/recommendations") {
        return Promise.resolve({
          data: {
            success: true,
            data: { items: [], total: 0, page: 1, limit: 6, pages: 1 },
            meta: { page: 1, pages: 1, total: 0 },
          },
        });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    const user = userEvent.setup();
    renderPage();

    // Wait for initial queries to settle so the button is enabled.
    expect(await screen.findByText(/No saved recommendations yet\./i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /download pdf report/i }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/recommendations/report",
        expect.objectContaining({ responseType: "blob" })
      );
    });
  });

  it("uses browser geolocation and sends lat/lon/region to the generator", async () => {
    localStorage.setItem("ecotrack_region", "1");

    const genParams = [];
    api.get.mockImplementation(async (url, config) => {
      if (url === "/recommendations/generate") {
        genParams.push(config?.params);
        return {
          data: {
            data: {
              weather: { city: "Colombo", tempC: 30, condition: "Clear" },
              tips: [
                {
                  ruleId: "car_reduce",
                  title: "Cut down car travel",
                  body: "Try public transport for 1–2 trips.",
                  impact: "High",
                  estimatedKgSaved: 5,
                  confidence: "medium",
                  why: ["Car travel is high in the selected range."],
                },
              ],
              evidence: { habits: { car_km: { totalValue: 80, totalKg: 100 } } },
            },
          },
        };
      }

      if (url === "/recommendations") {
        return {
          data: {
            success: true,
            data: { items: [], total: 0, page: 1, limit: 6, pages: 1 },
            meta: { page: 1, pages: 1, total: 0 },
          },
        };
      }

      throw new Error(`Unexpected GET ${url}`);
    });

    Object.defineProperty(globalThis.navigator, "geolocation", {
      value: {
        getCurrentPosition: vi.fn((success) =>
          success({ coords: { latitude: 6.9271, longitude: 79.8612 } })
        ),
      },
      configurable: true,
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Cut down car travel")).toBeInTheDocument();

    // Initial call should include region but no coords.
    expect(genParams.length).toBeGreaterThan(0);
    expect(genParams[0]?.region).toBe("1");
    expect(genParams[0]?.lat).toBeUndefined();
    expect(genParams[0]?.lon).toBeUndefined();

    await user.click(screen.getByRole("button", { name: /use my location/i }));

    await waitFor(() => {
      const last = genParams.at(-1);
      expect(last?.lat).toBe(6.9271);
      expect(last?.lon).toBe(79.8612);
      expect(last?.region).toBe("1");
    });
  });

  it("renders observed impact when present on saved recommendations", async () => {
    api.get.mockImplementation(async (url) => {
      if (url === "/recommendations/generate") {
        return {
          data: {
            data: {
              weather: null,
              tips: [],
              evidence: { habits: {} },
            },
          },
        };
      }

      if (url === "/recommendations") {
        return {
          data: {
            success: true,
            data: {
              items: [
                {
                  _id: "r1",
                  title: "Reduce car use",
                  body: "Try cutting car usage for a week.",
                  status: "done",
                  impact: "High",
                  observedImpact: {
                    windowDays: 7,
                    deltaKg: 10,
                    computedAt: new Date().toISOString(),
                  },
                },
              ],
              total: 1,
              page: 1,
              limit: 6,
              pages: 1,
            },
            meta: { page: 1, pages: 1, total: 1 },
          },
        };
      }

      throw new Error(`Unexpected GET ${url}`);
    });

    renderPage();

    expect(await screen.findByText("Reduce car use")).toBeInTheDocument();
    expect(screen.getByText(/Observed impact \(7d\):.*10 kg CO2e/i)).toBeInTheDocument();
  });
});
