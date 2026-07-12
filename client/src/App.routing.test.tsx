import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

vi.mock("./api/notes", () => ({
  getAccessToken: vi.fn(() => null),
  getRefreshToken: vi.fn(() => null),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  restoreSession: vi.fn(async () => false),
  fetchNotes: vi.fn(async () => []),
  fetchNote: vi.fn(),
  createNote: vi.fn(),
  updateNote: vi.fn(),
  login: vi.fn(),
  signup: vi.fn(),
  logoutFromServer: vi.fn(),
}));

describe("app routing", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("redirects unauthenticated users from protected routes to login", async () => {
    render(
      <MemoryRouter initialEntries={["/notes"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("login-page")).toBeInTheDocument();
  });

  it("mounts the notes list for authenticated users", async () => {
    const notesApi = await import("./api/notes");
    vi.mocked(notesApi.getAccessToken).mockReturnValue("test-token");
    vi.mocked(notesApi.restoreSession).mockResolvedValue(true);

    render(
      <MemoryRouter initialEntries={["/notes"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("notes-list")).toBeInTheDocument();
  });
});
