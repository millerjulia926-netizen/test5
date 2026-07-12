import { beforeEach, describe, expect, it, vi } from "vitest";

import { createNote } from "../api/notes";
import { enqueueCreate, getPendingCreates } from "./offlineQueue";
import { syncPendingNotes } from "./sync";

vi.mock("../api/notes", () => ({
  createNote: vi.fn(),
}));

describe("syncPendingNotes", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("syncs queued notes and clears them", async () => {
    vi.mocked(createNote).mockResolvedValue({
      id: "note-1",
      userId: "user-1",
      folderId: null,
      title: "Offline",
      content: "Draft",
      isPinned: false,
      archivedAt: null,
      pendingSync: false,
      syncConflict: false,
      captureSource: "typed",
      needsReview: false,
      transcriptionConfidence: null,
      createdAt: "2026-07-11T10:00:00.000Z",
      updatedAt: "2026-07-11T10:00:00.000Z",
    });

    enqueueCreate({ title: "Offline", content: "Draft" });

    const result = await syncPendingNotes();

    expect(result.synced).toBe(1);
    expect(createNote).toHaveBeenCalledOnce();
    expect(getPendingCreates()).toHaveLength(0);
  });
});
