import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

const { api } = vi.hoisted(() => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock("../api/client", () => ({
  api,
}));

vi.mock("../components/Navbar", () => ({
  default: function NavbarMock() {
    return null;
  },
}));

import Dashboard from "./Dashboard";

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0 },
    },
  });

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Dashboard page", () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it("shows an error banner when summary fetch fails", async () => {
    api.get.mockImplementation(async (url) => {
      if (url === "/emissions/summary") throw new Error("fail");
      if (url === "/emissions/trends") return { data: { data: [] } };
      if (url === "/health/integrations") return { data: { data: { openWeather: {}, climatiq: {}, email: {} } } };
      if (url === "/emissions") return { data: { data: { items: [], total: 0, page: 1, limit: 10, pages: 1 } } };
      throw new Error(`Unexpected GET ${url}`);
    });

    renderPage();

    expect(
      await screen.findByText(/Failed to load dashboard data/i, undefined, { timeout: 2000 })
    ).toBeInTheDocument();
  });

  it("renders the empty trend message when there is no trend data", async () => {
    api.get.mockImplementation(async (url) => {
      if (url === "/emissions/summary") {
        return {
          data: {
            data: {
              totalKg: 12.34,
              count: 0,
              byType: [],
              gridIntensityGPerKwh: 450,
            },
          },
        };
      }

      if (url === "/emissions/trends") return { data: { data: [] } };
      if (url === "/health/integrations") return { data: { data: { openWeather: {}, climatiq: {}, email: {} } } };
      if (url === "/emissions") return { data: { data: { items: [], total: 0, page: 1, limit: 10, pages: 1 } } };

      throw new Error(`Unexpected GET ${url}`);
    });

    renderPage();

    const emptyMsgs = await screen.findAllByText(/No emissions logged yet\./i);
    expect(emptyMsgs.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/12\.34\s*kg/i).length).toBeGreaterThan(0);
  });
});
