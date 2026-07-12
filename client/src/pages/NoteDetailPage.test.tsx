import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Note } from "../api/notes";
import { MarkdownContent } from "../components/MarkdownContent";
import { NoteDetailPage } from "../pages/NoteDetailPage";

vi.mock("../api/notes", () => ({
  fetchNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

import { fetchNote } from "../api/notes";

const sampleNote: Note = {
  id: "note-1",
  userId: "user-1",
  folderId: null,
  title: "Meeting notes",
  content: "Discuss roadmap",
  isPinned: false,
  archivedAt: null,
  pendingSync: false,
  syncConflict: false,
  captureSource: "typed",
  needsReview: false,
  transcriptionConfidence: null,
  createdAt: "2026-07-11T10:00:00.000Z",
  updatedAt: "2026-07-11T12:00:00.000Z",
};

describe("NoteDetailPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("binds note data when loaded", async () => {
    vi.mocked(fetchNote).mockResolvedValue(sampleNote);

    render(
      <MemoryRouter initialEntries={["/notes/note-1"]}>
        <Routes>
          <Route path="/notes/:id" element={<NoteDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("note-detail")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Meeting notes" })).toBeInTheDocument();
    expect(screen.getByTestId("markdown-content")).toHaveTextContent("Discuss roadmap");
  });
});

describe("MarkdownContent", () => {
  it("renders markdown content", () => {
    render(<MarkdownContent content="# Hello" />);
    expect(screen.getByRole("heading", { name: "Hello" })).toBeInTheDocument();
  });
});
