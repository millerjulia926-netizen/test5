import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPendingCreates } from "../lib/offlineQueue";
import { NoteEditorPage } from "./NoteEditorPage";

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isRestoring: false,
    logout: vi.fn(),
  }),
}));

vi.mock("../api/notes", async () => {
  const actual = await vi.importActual<typeof import("../api/notes")>("../api/notes");
  return {
    ...actual,
    createNote: vi.fn(async (input: { title: string; content: string; captureSource?: string }) => ({
      id: "note-123",
      userId: "user-1",
      folderId: null,
      title: input.title,
      content: input.content,
      isPinned: false,
      archivedAt: null,
      pendingSync: false,
      syncConflict: false,
      captureSource: input.captureSource ?? "typed",
      needsReview: false,
      transcriptionConfidence: null,
      createdAt: "2026-07-11T10:00:00.000Z",
      updatedAt: "2026-07-11T10:00:00.000Z",
    })),
    fetchNote: vi.fn(),
    updateNote: vi.fn(),
  };
});

function renderNewNoteEditor() {
  return render(
    <MemoryRouter initialEntries={["/notes/new"]}>
      <Routes>
        <Route path="notes/new" element={<NoteEditorPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillEditor(title: string, content: string) {
  fireEvent.change(screen.getByPlaceholderText("Note title"), { target: { value: title } });
  fireEvent.change(screen.getByPlaceholderText("Start writing..."), { target: { value: content } });
}

describe("NoteEditorPage API wiring", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("creates a note online through the API", async () => {
    const notesApi = await import("../api/notes");

    renderNewNoteEditor();
    fillEditor("Online note", "Saved to server");
    fireEvent.click(screen.getByRole("button", { name: "Save now" }));

    await waitFor(() => {
      expect(notesApi.createNote).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Online note",
          content: "Saved to server",
        }),
      );
    });
  });

  it("stores offline creates locally with a pending-sync queue", async () => {
    const notesApi = await import("../api/notes");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });

    renderNewNoteEditor();
    fillEditor("Offline note", "Queued locally");
    fireEvent.click(screen.getByRole("button", { name: "Save now" }));

    await waitFor(() => {
      expect(screen.getByText("Saved offline. It will sync when you are back online.")).toBeInTheDocument();
    });

    expect(notesApi.createNote).not.toHaveBeenCalled();
    expect(getPendingCreates()).toHaveLength(1);
    expect(getPendingCreates()[0]).toMatchObject({
      title: "Offline note",
      content: "Queued locally",
    });
  });

  it("saves voice-captured notes through the same create path", async () => {
    const notesApi = await import("../api/notes");

    renderNewNoteEditor();
    fillEditor("Voice note", "");
    fireEvent.click(screen.getByRole("button", { name: "Voice capture" }));
    fireEvent.click(screen.getByRole("button", { name: "Save now" }));

    await waitFor(() => {
      expect(notesApi.createNote).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Voice note",
          captureSource: "voice",
          transcriptionConfidence: 0.42,
          needsReview: true,
        }),
      );
    });
  });

  it("shows conflict resolution actions after a sync conflict", async () => {
    const notesApi = await import("../api/notes");
    const { SyncConflictError } = notesApi;

    vi.mocked(notesApi.createNote).mockRejectedValueOnce(
      new SyncConflictError("Note was updated on another device", {
        id: "note-123",
        userId: "user-1",
        folderId: null,
        title: "Server title",
        content: "Server content",
        isPinned: false,
        archivedAt: null,
        pendingSync: false,
        syncConflict: true,
        captureSource: "typed",
        needsReview: false,
        transcriptionConfidence: null,
        createdAt: "2026-07-11T10:00:00.000Z",
        updatedAt: "2026-07-11T10:05:00.000Z",
      }),
    );

    renderNewNoteEditor();
    fillEditor("Conflict note", "Local edit");
    fireEvent.click(screen.getByRole("button", { name: "Save now" }));

    expect(await screen.findByTestId("conflict-resolution")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use server version" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save my version" })).toBeInTheDocument();
  });
});
