import { beforeEach, describe, expect, it } from "vitest";

import {
  clearPendingQueue,
  enqueueCreate,
  getPendingCreates,
  mergeNotesWithPending,
  removePendingCreate,
} from "./offlineQueue";

describe("offlineQueue", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("enqueues and removes pending creates", () => {
    const entry = enqueueCreate({ title: "Offline", content: "Draft" });

    expect(getPendingCreates()).toHaveLength(1);
    expect(entry.localId).toBeTruthy();

    removePendingCreate(entry.localId);
    expect(getPendingCreates()).toHaveLength(0);
  });

  it("merges pending notes into server list", () => {
    const pending = enqueueCreate({ title: "Local", content: "Queued" });
    const merged = mergeNotesWithPending(
      [
        {
          id: "server-1",
          userId: "user-1",
          folderId: null,
          title: "Server",
          content: "From API",
          isPinned: false,
          archivedAt: null,
          pendingSync: false,
          syncConflict: false,
          captureSource: "typed",
          needsReview: false,
          transcriptionConfidence: null,
          createdAt: "2026-07-10T10:00:00.000Z",
          updatedAt: "2026-07-10T11:00:00.000Z",
        },
      ],
      [pending],
    );

    expect(merged).toHaveLength(2);
    expect(merged.some((note) => note.id.startsWith("local:"))).toBe(true);
  });

  it("clears the queue", () => {
    enqueueCreate({ title: "One", content: "A" });
    clearPendingQueue();
    expect(getPendingCreates()).toHaveLength(0);
  });
});
