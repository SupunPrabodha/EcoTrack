import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { render, screen } from "@testing-library/react";

let authState = { user: null, loading: false };

vi.mock("./useAuth", () => ({
  useAuth: () => authState,
}));

import ProtectedRoute from "./ProtectedRoute";

describe("ProtectedRoute", () => {
  it("redirects to /login when unauthenticated", async () => {
    authState = { user: null, loading: false };

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Private</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>LoginPage</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("LoginPage")).toBeInTheDocument();
  });

  it("renders children when authenticated", async () => {
    authState = { user: { id: "u1" }, loading: false };

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Private</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>LoginPage</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Private")).toBeInTheDocument();
    expect(screen.queryByText("LoginPage")).not.toBeInTheDocument();
  });

  it("renders nothing while loading", () => {
    authState = { user: null, loading: true };

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Private</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>LoginPage</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText("Private")).not.toBeInTheDocument();
    expect(screen.queryByText("LoginPage")).not.toBeInTheDocument();
  });
});
