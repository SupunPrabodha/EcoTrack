import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const loginFn = vi.fn(async () => ({ id: "u1" }));
const registerFn = vi.fn(async () => ({ id: "u1" }));

vi.mock("../auth/useAuth", () => ({
  useAuth: () => ({ login: loginFn, register: registerFn }),
}));

import Login from "./Login";

describe("Login page", () => {
  it("logs in and navigates to dashboard", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>HOME</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), "test@example.com");

    await user.clear(screen.getByLabelText(/password/i));
    await user.type(screen.getByLabelText(/password/i), "Password123!");

    await user.click(screen.getByRole("button", { name: /^login$/i }));

    expect(loginFn).toHaveBeenCalledWith("test@example.com", "Password123!");
    expect(await screen.findByText("HOME")).toBeInTheDocument();
  });

  it("registers and navigates to dashboard", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>HOME</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /register/i }));

    await user.clear(screen.getByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), "New User");

    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), "new@example.com");

    await user.clear(screen.getByLabelText(/password/i));
    await user.type(screen.getByLabelText(/password/i), "Password123!");

    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(registerFn).toHaveBeenCalledWith("New User", "new@example.com", "Password123!");
    expect(await screen.findByText("HOME")).toBeInTheDocument();
  });
});
