import { TRANSCRIPTION_REVIEW_THRESHOLD, type CaptureSource } from "./validation.js";

export function applyVoiceCaptureRules(input: {
  captureSource: CaptureSource;
  transcriptionConfidence: number | null;
  needsReview?: boolean;
}): { needsReview: boolean } {
  if (input.captureSource !== "voice") {
    return { needsReview: input.needsReview ?? false };
  }

  const confidence = input.transcriptionConfidence;
  if (confidence !== null && confidence < TRANSCRIPTION_REVIEW_THRESHOLD) {
    return { needsReview: true };
  }

  return { needsReview: input.needsReview ?? false };
}

export function validatePinArchiveRule(
  existing: { archivedAt: Date | null },
  updates: { isPinned?: boolean; archived?: boolean },
): string | null {
  const willBeArchived = updates.archived === true || (updates.archived === undefined && existing.archivedAt !== null);

  if (updates.isPinned === true && willBeArchived) {
    return "Archived notes cannot be pinned";
  }

  return null;
}

export function resolvePendingSyncOnUpdate(
  existing: { pendingSync: boolean },
  requestedPendingSync: boolean | undefined,
): boolean | undefined {
  if (requestedPendingSync !== undefined) {
    return requestedPendingSync;
  }

  if (existing.pendingSync) {
    return false;
  }

  return undefined;
}
