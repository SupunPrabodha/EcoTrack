import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { render, screen } from "@testing-library/react";

vi.mock("./useAuth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

import ProtectedRoute from "./ProtectedRoute";

describe("ProtectedRoute", () => {
  it("redirects to /login when unauthenticated", async () => {
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
});
