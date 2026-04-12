import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { api } = vi.hoisted(() => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
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

import Goals from "./Goals";

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Goals />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Goals page", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    api.put.mockReset();
    api.delete.mockReset();
  });

  it("shows empty state when there is no active goal", async () => {
    api.get.mockImplementation(async (url, config) => {
      if (url === "/goals/usage/external-summary") {
        return { data: { data: { yesterday: { totalKg: 0 }, last7Days: { totalKg: 0 }, lastMonth: { totalKg: 0 } } } };
      }

      if (url === "/goals") {
        const params = config?.params || {};
        if (params.status === "active") return { data: { data: { items: [] } } };
        return { data: { data: { items: [] } } };
      }

      throw new Error(`Unexpected GET ${url}`);
    });

    renderPage();

    expect(await screen.findByText(/No active daily goal found\./i)).toBeInTheDocument();
  });

  it("creates a daily goal with alerts enabled", async () => {
    api.get.mockImplementation(async (url, config) => {
      if (url === "/goals/usage/external-summary") {
        return { data: { data: { yesterday: { totalKg: 1.23 }, last7Days: { totalKg: 9.87 }, lastMonth: { totalKg: 30.12 } } } };
      }

      if (url === "/goals") {
        const params = config?.params || {};
        if (params.status === "active") return { data: { data: { items: [] } } };
        return { data: { data: { items: [] } } };
      }

      throw new Error(`Unexpected GET ${url}`);
    });

    // Keep pending to avoid refetch timing concerns.
    api.post.mockImplementation((url) => {
      if (url === "/goals") return new Promise(() => {});
      throw new Error(`Unexpected POST ${url}`);
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/Goals & Accountability/i)).toBeInTheDocument();

    const checkbox = screen.getByRole("checkbox", { name: /enable email alerts/i });
    await user.click(checkbox);

    const emailInput = screen.getByPlaceholderText(/alert email/i);
    await user.type(emailInput, "alerts@example.com");

    await user.click(screen.getByRole("button", { name: /set daily target/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));

    const [url, body] = api.post.mock.calls[0];
    expect(url).toBe("/goals");
    expect(body).toEqual(
      expect.objectContaining({
        title: "Daily CO₂ Target",
        period: "daily",
        maxKg: 20,
        alertsEnabled: true,
        alertEmail: "alerts@example.com",
        startDate: expect.any(String),
        endDate: expect.any(String),
      })
    );
  });

  it("updates the target when editing an existing goal", async () => {
    const goal = {
      _id: "g1",
      title: "Daily CO₂ Target",
      period: "daily",
      maxKg: 20,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86_400_000).toISOString(),
      status: "active",
      alertsEnabled: false,
    };

    api.get.mockImplementation(async (url, config) => {
      if (url === "/goals/usage/external-summary") {
        return { data: { data: { yesterday: { totalKg: 1 }, last7Days: { totalKg: 2 }, lastMonth: { totalKg: 3 } } } };
      }

      if (url === "/goals") {
        const params = config?.params || {};
        if (params.status === "active" && params.period === "daily") return { data: { data: { items: [goal] } } };
        if (params.status === "active") return { data: { data: { items: [] } } };
        return { data: { data: { items: [] } } };
      }

      throw new Error(`Unexpected GET ${url}`);
    });

    api.post.mockImplementation(async (url) => {
      if (url === "/goals/g1/evaluate") {
        return {
          data: {
            data: {
              progress: { currentKg: 5, maxKg: 20, status: "active" },
              alert: { sent: false, provider: "none", reason: "none" },
            },
          },
        };
      }
      throw new Error(`Unexpected POST ${url}`);
    });

    api.put.mockImplementation(() => new Promise(() => {}));

    const user = userEvent.setup();
    renderPage();

    const titleEl = await screen.findByText(/Daily CO₂ Target Progress/i);
    const progressCard = titleEl.closest("div.glass-card");
    expect(progressCard).toBeTruthy();

    await within(progressCard).findByRole("button", { name: /remove goal/i });

    const buttons = within(progressCard).getAllByRole("button");
    const editBtn = buttons.find((b) => (b.textContent || "").trim() === "");
    expect(editBtn).toBeTruthy();

    await user.click(editBtn);

    const editInput = within(progressCard).getByRole("spinbutton");
    await user.clear(editInput);
    await user.type(editInput, "25");
    await act(async () => {
      editInput.blur();
    });

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith("/goals/g1", { maxKg: 25 });
    });
  });

  it("removes an existing goal", async () => {
    const goal = {
      _id: "g1",
      title: "Daily CO₂ Target",
      period: "daily",
      maxKg: 20,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86_400_000).toISOString(),
      status: "active",
      alertsEnabled: false,
    };

    api.get.mockImplementation(async (url, config) => {
      if (url === "/goals/usage/external-summary") {
        return { data: { data: { yesterday: { totalKg: 1 }, last7Days: { totalKg: 2 }, lastMonth: { totalKg: 3 } } } };
      }

      if (url === "/goals") {
        const params = config?.params || {};
        if (params.status === "active" && params.period === "daily") return { data: { data: { items: [goal] } } };
        if (params.status === "active") return { data: { data: { items: [] } } };
        return { data: { data: { items: [] } } };
      }

      throw new Error(`Unexpected GET ${url}`);
    });

    api.post.mockImplementation(async (url) => {
      if (url === "/goals/g1/evaluate") {
        return {
          data: {
            data: {
              progress: { currentKg: 5, maxKg: 20, status: "active" },
              alert: { sent: false, provider: "none", reason: "none" },
            },
          },
        };
      }
      throw new Error(`Unexpected POST ${url}`);
    });

    api.delete.mockImplementation(() => new Promise(() => {}));

    const user = userEvent.setup();
    renderPage();

    const removeBtn = await screen.findByRole("button", { name: /remove goal/i });
    await user.click(removeBtn);

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/goals/g1"));
  });

  it("renders completed goals badges", async () => {
    api.get.mockImplementation(async (url, config) => {
      if (url === "/goals/usage/external-summary") {
        return { data: { data: { yesterday: { totalKg: 0 }, last7Days: { totalKg: 0 }, lastMonth: { totalKg: 0 } } } };
      }

      if (url === "/goals") {
        const params = config?.params || {};
        if (params.status === "active") return { data: { data: { items: [] } } };

        return {
          data: {
            data: {
              items: [
                {
                  _id: "c1",
                  title: "Daily CO₂ Target",
                  period: "daily",
                  maxKg: 10,
                  startDate: new Date().toISOString(),
                  endDate: new Date().toISOString(),
                  status: "achieved",
                },
                {
                  _id: "c2",
                  title: "Weekly CO₂ Target",
                  period: "weekly",
                  maxKg: 70,
                  startDate: new Date().toISOString(),
                  endDate: new Date().toISOString(),
                  status: "failed",
                },
              ],
            },
          },
        };
      }

      throw new Error(`Unexpected GET ${url}`);
    });

    renderPage();

    const completedTitle = await screen.findByText(/Completed goals/i);
    const completedCard = completedTitle.closest("div.glass-card");
    expect(completedCard).toBeTruthy();

    expect(await within(completedCard).findByText(/^Daily CO₂ Target$/i)).toBeInTheDocument();
    expect(within(completedCard).getByText(/Achieved/i)).toBeInTheDocument();
    expect(within(completedCard).getByText(/Failed/i)).toBeInTheDocument();
  });
});
