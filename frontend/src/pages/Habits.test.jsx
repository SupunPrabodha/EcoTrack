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

vi.mock("../components/Navbar", () => ({
  default: function NavbarMock() {
    return null;
  },
}));

import Habits from "./Habits";

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Habits />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Habits page", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  it("shows empty state when no habits logged today", async () => {
    api.get.mockImplementation(async (url) => {
      if (url === "/habits") return { data: { data: { items: [] } } };
      if (url === "/habits/summary") return { data: { data: { items: [] } } };
      if (url === "/reports/monthly") return { data: { data: { summary: { totalKg: 0 }, trends: [] } } };
      throw new Error(`Unexpected GET ${url}`);
    });

    renderPage();

    expect(await screen.findByText(/No habits logged today yet\./i)).toBeInTheDocument();
    expect(screen.getByText(/No logs in this range yet\./i)).toBeInTheDocument();
  });

  it("posts a habit when clicking Add", async () => {
    api.get.mockImplementation(async (url) => {
      if (url === "/habits") return { data: { data: { items: [] } } };
      if (url === "/habits/summary") return { data: { data: { items: [] } } };
      if (url === "/reports/monthly") return { data: { data: { summary: { totalKg: 0 }, trends: [] } } };
      throw new Error(`Unexpected GET ${url}`);
    });

    // Keep pending to avoid onSuccess invalidation timing concerns.
    api.post.mockImplementation(() => new Promise(() => {}));

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/No habits logged today yet\./i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));

    const [url, body] = api.post.mock.calls[0];
    expect(url).toBe("/habits");
    expect(body).toEqual(
      expect.objectContaining({
        type: "car_km",
        value: 5,
        date: expect.any(String),
      })
    );
  });

  it("calls the monthly PDF endpoint when clicking Download PDF", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/habits") return Promise.resolve({ data: { data: { items: [] } } });
      if (url === "/habits/summary") return Promise.resolve({ data: { data: { items: [] } } });
      if (url === "/reports/monthly") {
        return Promise.resolve({
          data: {
            data: {
              summary: { totalKg: 0 },
              trends: [],
            },
          },
        });
      }

      if (url === "/reports/monthly/pdf") return new Promise(() => {});

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    const user = userEvent.setup();
    renderPage();

    const downloadBtn = await screen.findByRole("button", { name: /download pdf/i });

    await waitFor(() => expect(downloadBtn).toBeEnabled());
    await user.click(downloadBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/reports/monthly/pdf",
        expect.objectContaining({ responseType: "blob" })
      );
    });
  });
});
