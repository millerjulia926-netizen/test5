import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GuestRoute } from "./GuestRoute";

vi.mock("./AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "./AuthContext";

describe("GuestRoute", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("redirects authenticated users away from login", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isRestoring: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="login" element={<div>Login page</div>} />
          </Route>
          <Route path="notes" element={<div>Notes page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Notes page")).toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });

  it("renders guest content for unauthenticated users", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isRestoring: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="login" element={<div>Login page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
});
