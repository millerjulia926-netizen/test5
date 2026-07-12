import type { Note } from "../api/notes";

export type PendingNoteCreate = {
  localId: string;
  title: string;
  content: string;
  captureSource?: "typed" | "voice";
  needsReview?: boolean;
  transcriptionConfidence?: number | null;
  createdAt: string;
};

const QUEUE_KEY = "notes:pending_queue";

function readQueue(): PendingNoteCreate[] {
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as PendingNoteCreate[];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingNoteCreate[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getPendingCreates(): PendingNoteCreate[] {
  return readQueue();
}

export function enqueueCreate(
  input: Omit<PendingNoteCreate, "localId" | "createdAt">,
): PendingNoteCreate {
  const entry: PendingNoteCreate = {
    ...input,
    localId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  writeQueue([entry, ...readQueue()]);
  return entry;
}

export function removePendingCreate(localId: string): void {
  writeQueue(readQueue().filter((item) => item.localId !== localId));
}

export function clearPendingQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

export function pendingCreateToNote(pending: PendingNoteCreate): Note {
  return {
    id: `local:${pending.localId}`,
    userId: "local",
    folderId: null,
    title: pending.title,
    content: pending.content,
    isPinned: false,
    archivedAt: null,
    pendingSync: true,
    syncConflict: false,
    captureSource: pending.captureSource ?? "typed",
    needsReview: pending.needsReview ?? false,
    transcriptionConfidence: pending.transcriptionConfidence ?? null,
    createdAt: pending.createdAt,
    updatedAt: pending.createdAt,
  };
}

export function mergeNotesWithPending(serverNotes: Note[], pending: PendingNoteCreate[]): Note[] {
  if (pending.length === 0) {
    return serverNotes;
  }

  const localNotes = pending.map(pendingCreateToNote);
  return [...localNotes, ...serverNotes].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}
