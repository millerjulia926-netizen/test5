import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProtectedRoute } from "./ProtectedRoute";

vi.mock("./AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "./AuthContext";

describe("ProtectedRoute", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to login", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isRestoring: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/notes"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="notes" element={<div>Protected notes</div>} />
          </Route>
          <Route path="login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Protected notes")).not.toBeInTheDocument();
  });

  it("renders protected content for authenticated users", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isRestoring: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/notes"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="notes" element={<div>Protected notes</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Protected notes")).toBeInTheDocument();
  });

  it("shows a loading state while restoring a session", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isRestoring: true,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/notes"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="notes" element={<div>Protected notes</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("loading-state")).toHaveTextContent("Restoring session...");
  });
});
