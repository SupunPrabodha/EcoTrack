import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let authUser = { email: "user@example.com", role: "user" };
const logoutFn = vi.fn();

vi.mock("../auth/useAuth", () => ({
  useAuth: () => ({ user: authUser, logout: logoutFn }),
}));

import Navbar from "./Navbar";

describe("Navbar", () => {
  beforeEach(() => {
    logoutFn.mockClear();
    authUser = { email: "user@example.com", role: "user" };
  });

  it("renders main navigation links", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /habits/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /emissions/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /goals/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /recommendations/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /map/i })).toBeInTheDocument();
  });

  it("shows Admin link only for admin users", () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.queryByRole("link", { name: /admin/i })).not.toBeInTheDocument();

    authUser = { email: "admin@example.com", role: "admin" };
    rerender(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /admin/i })).toBeInTheDocument();
  });

  it("calls logout when clicking Logout", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /logout/i }));
    expect(logoutFn).toHaveBeenCalledTimes(1);
  });
});
