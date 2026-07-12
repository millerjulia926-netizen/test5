import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "./auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { NoteEditorPage } from "./pages/NoteEditorPage";
import { NotesListPage } from "./pages/NotesListPage";

vi.mock("./api/notes", () => ({
  getAccessToken: () => "test-token",
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  restoreSession: vi.fn(async () => true),
  fetchNotes: vi.fn(async () => []),
  fetchNote: vi.fn(),
  createNote: vi.fn(),
  updateNote: vi.fn(),
  login: vi.fn(),
  signup: vi.fn(),
}));

describe("app routing", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.setItem("notes_access_token", "test-token");
  });

  it("mounts the notes list inside the app shell at /notes", async () => {
    render(
      <MemoryRouter initialEntries={["/notes"]}>
        <AuthProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="notes" element={<NotesListPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(await screen.findByTestId("notes-list")).toBeInTheDocument();
  });

  it("mounts the editor inside the app shell at /notes/new", () => {
    render(
      <MemoryRouter initialEntries={["/notes/new"]}>
        <AuthProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="notes/new" element={<NoteEditorPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByTestId("note-editor")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "New note" })).toBeInTheDocument();
  });
});
