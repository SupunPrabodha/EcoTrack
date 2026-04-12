import { describe, it, expect, vi, beforeEach } from "vitest";
import { useContext } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { api, responseErrorHandlerRef } = vi.hoisted(() => {
  const responseErrorHandlerRef = { current: undefined };

  const api = {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      response: {
        use: vi.fn((onFulfilled, onRejected) => {
          responseErrorHandlerRef.current = onRejected;
          return 123;
        }),
        eject: vi.fn(),
      },
    },
  };

  return { api, responseErrorHandlerRef };
});

vi.mock("../api/client", () => ({
  api,
}));

import { AuthCtx, AuthProvider } from "./AuthContext";

function Consumer() {
  const { user, loading, login, register, logout } = useContext(AuthCtx);

  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="user">{user?.email || "none"}</div>

      <button onClick={() => login("test@example.com", "Password123!")}>Do login</button>
      <button onClick={() => register("New User", "new@example.com", "Password123!")}>Do register</button>
      <button onClick={() => logout()}>Do logout</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    api.interceptors.response.use.mockClear();
    api.interceptors.response.eject.mockClear();
    responseErrorHandlerRef.current = undefined;
  });

  it("loads /auth/me on mount and sets user", async () => {
    api.get.mockResolvedValueOnce({
      data: { data: { id: "u1", email: "user@example.com", role: "user" } },
    });

    const { unmount } = render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    expect(api.interceptors.response.use).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith("/auth/me");

    expect(await screen.findByTestId("user")).toHaveTextContent("user@example.com");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");

    unmount();
    expect(api.interceptors.response.eject).toHaveBeenCalledWith(123);
  });

  it("sets user to none when /auth/me fails", async () => {
    api.get.mockRejectedValueOnce(new Error("fail"));

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("login calls API and updates user", async () => {
    const user = userEvent.setup();

    api.get.mockRejectedValueOnce(new Error("no-session"));
    api.post.mockImplementation(async (url, body) => {
      if (url === "/auth/login") {
        return { data: { data: { id: "u1", email: body.email, role: "user" } } };
      }
      throw new Error(`Unexpected POST ${url}`);
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await user.click(screen.getByRole("button", { name: /do login/i }));

    expect(api.post).toHaveBeenCalledWith("/auth/login", {
      email: "test@example.com",
      password: "Password123!",
    });

    expect(await screen.findByTestId("user")).toHaveTextContent("test@example.com");
  });

  it("register calls /auth/register then /auth/login", async () => {
    const user = userEvent.setup();

    api.get.mockRejectedValueOnce(new Error("no-session"));
    api.post.mockImplementation(async (url, body) => {
      if (url === "/auth/register") return { data: { success: true } };
      if (url === "/auth/login") return { data: { data: { id: "u1", email: body.email, role: "user" } } };
      throw new Error(`Unexpected POST ${url}`);
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await user.click(screen.getByRole("button", { name: /do register/i }));

    expect(api.post).toHaveBeenCalledWith("/auth/register", {
      name: "New User",
      email: "new@example.com",
      password: "Password123!",
    });

    expect(api.post).toHaveBeenCalledWith("/auth/login", {
      email: "new@example.com",
      password: "Password123!",
    });

    expect(await screen.findByTestId("user")).toHaveTextContent("new@example.com");
  });

  it("logout calls /auth/logout and clears user", async () => {
    const user = userEvent.setup();

    api.get.mockResolvedValueOnce({
      data: { data: { id: "u1", email: "user@example.com", role: "user" } },
    });

    api.post.mockImplementation(async (url) => {
      if (url === "/auth/logout") return { data: { success: true } };
      throw new Error(`Unexpected POST ${url}`);
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    expect(await screen.findByTestId("user")).toHaveTextContent("user@example.com");

    await user.click(screen.getByRole("button", { name: /do logout/i }));

    expect(api.post).toHaveBeenCalledWith("/auth/logout");
    expect(await screen.findByTestId("user")).toHaveTextContent("none");
  });

  it("clears user when interceptor receives 401", async () => {
    api.get.mockResolvedValueOnce({
      data: { data: { id: "u1", email: "user@example.com", role: "user" } },
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    expect(await screen.findByTestId("user")).toHaveTextContent("user@example.com");
    expect(typeof responseErrorHandlerRef.current).toBe("function");

    await act(async () => {
      try {
        await responseErrorHandlerRef.current({ response: { status: 401 } });
      } catch {
        // interceptor returns a rejected promise by design
      }
    });

    expect(await screen.findByTestId("user")).toHaveTextContent("none");
  });
});
