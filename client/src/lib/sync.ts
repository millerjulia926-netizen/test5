import { createNote } from "../api/notes";
import { getPendingCreates, removePendingCreate } from "./offlineQueue";

const SYNC_DEADLINE_MS = 5000;

export type SyncResult = {
  synced: number;
  failed: number;
};

export async function syncPendingNotes(): Promise<SyncResult> {
  const pending = getPendingCreates();
  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  const deadline = Date.now() + SYNC_DEADLINE_MS;
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    if (Date.now() > deadline) {
      failed += pending.length - synced - failed;
      break;
    }

    try {
      await createNote({
        title: item.title,
        content: item.content,
        captureSource: item.captureSource,
        needsReview: item.needsReview,
        transcriptionConfidence: item.transcriptionConfidence ?? undefined,
      });
      removePendingCreate(item.localId);
      synced += 1;
    } catch {
      failed += 1;
    }
  }

  return { synced, failed };
}
