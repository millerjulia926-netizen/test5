export const MAX_TITLE_LENGTH = 200;
export const MAX_CONTENT_LENGTH = 100_000;
export const TRANSCRIPTION_REVIEW_THRESHOLD = 0.7;

export type CaptureSource = "typed" | "voice";

export function validateTitle(title: unknown): string | null {
  if (typeof title !== "string" || !title.trim()) {
    return "Title is required";
  }

  if (title.trim().length > MAX_TITLE_LENGTH) {
    return `Title must be at most ${MAX_TITLE_LENGTH} characters`;
  }

  return null;
}

export function validateContent(content: unknown): string | null {
  if (content === undefined) {
    return null;
  }

  if (typeof content !== "string") {
    return "Content must be a string";
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return `Content must be at most ${MAX_CONTENT_LENGTH} characters`;
  }

  return null;
}

export function parseCaptureSource(value: unknown): CaptureSource | undefined | null {
  if (value === undefined) {
    return undefined;
  }

  if (value === "typed" || value === "voice") {
    return value;
  }

  return null;
}

export function validateTranscriptionConfidence(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    return "transcriptionConfidence must be a number";
  }

  if (value < 0 || value > 1) {
    return "transcriptionConfidence must be between 0 and 1";
  }

  return null;
}

export function validateBooleanField(fieldName: string, value: unknown): string | null {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== "boolean") {
    return `${fieldName} must be a boolean`;
  }

  return null;
}

export type CreateNoteInput = {
  title: string;
  content: string;
  folderId?: string | null;
  pendingSync?: boolean;
  captureSource?: CaptureSource;
  needsReview?: boolean;
  transcriptionConfidence?: number | null;
};

export function validateCreateNoteInput(body: unknown): { error: string } | { input: CreateNoteInput } {
  const payload = (body ?? {}) as Record<string, unknown>;
  const titleError = validateTitle(payload.title);
  if (titleError) {
    return { error: titleError };
  }

  const contentError = validateContent(payload.content);
  if (contentError) {
    return { error: contentError };
  }

  const parsedCaptureSource = parseCaptureSource(payload.captureSource);
  if (parsedCaptureSource === null) {
    return { error: "captureSource must be 'typed' or 'voice'" };
  }

  for (const [field, value] of [
    ["needsReview", payload.needsReview],
    ["pendingSync", payload.pendingSync],
  ] as const) {
    const error = validateBooleanField(field, value);
    if (error) {
      return { error };
    }
  }

  const confidenceError = validateTranscriptionConfidence(payload.transcriptionConfidence);
  if (confidenceError) {
    return { error: confidenceError };
  }

  if (payload.folderId !== undefined && payload.folderId !== null && typeof payload.folderId !== "string") {
    return { error: "folderId must be a string or null" };
  }

  return {
    input: {
      title: String(payload.title).trim(),
      content: typeof payload.content === "string" ? payload.content : "",
      folderId: payload.folderId as string | null | undefined,
      pendingSync: payload.pendingSync as boolean | undefined,
      captureSource: parsedCaptureSource,
      needsReview: payload.needsReview as boolean | undefined,
      transcriptionConfidence: payload.transcriptionConfidence as number | null | undefined,
    },
  };
}

export type UpdateNoteInput = {
  title?: string;
  content?: string;
  folderId?: string | null;
  isPinned?: boolean;
  archived?: boolean;
  pendingSync?: boolean;
  needsReview?: boolean;
  captureSource?: CaptureSource;
  transcriptionConfidence?: number | null;
  expectedUpdatedAt?: string;
  deviceId?: string;
};

export function validateUpdateNoteInput(body: unknown): { error: string } | { input: UpdateNoteInput } {
  const payload = (body ?? {}) as Record<string, unknown>;
  const input: UpdateNoteInput = {};

  if (payload.title !== undefined) {
    const titleError = validateTitle(payload.title);
    if (titleError) {
      return { error: "Title must be a non-empty string" };
    }
    input.title = String(payload.title).trim();
  }

  if (payload.content !== undefined) {
    const contentError = validateContent(payload.content);
    if (contentError) {
      return { error: contentError };
    }
    input.content = payload.content as string;
  }

  const parsedCaptureSource = parseCaptureSource(payload.captureSource);
  if (parsedCaptureSource === null) {
    return { error: "captureSource must be 'typed' or 'voice'" };
  }
  if (parsedCaptureSource !== undefined) {
    input.captureSource = parsedCaptureSource;
  }

  for (const [field, value] of [
    ["isPinned", payload.isPinned],
    ["archived", payload.archived],
    ["pendingSync", payload.pendingSync],
    ["needsReview", payload.needsReview],
  ] as const) {
    const error = validateBooleanField(field, value);
    if (error) {
      return { error };
    }
    if (value !== undefined) {
      input[field] = value as boolean;
    }
  }

  const confidenceError = validateTranscriptionConfidence(payload.transcriptionConfidence);
  if (confidenceError) {
    return { error: confidenceError };
  }
  if (payload.transcriptionConfidence !== undefined) {
    input.transcriptionConfidence = payload.transcriptionConfidence as number | null;
  }

  if (payload.folderId !== undefined) {
    if (payload.folderId !== null && typeof payload.folderId !== "string") {
      return { error: "folderId must be a string or null" };
    }
    input.folderId = payload.folderId as string | null;
  }

  if (payload.expectedUpdatedAt !== undefined) {
    if (typeof payload.expectedUpdatedAt !== "string") {
      return { error: "expectedUpdatedAt must be an ISO date string" };
    }
    input.expectedUpdatedAt = payload.expectedUpdatedAt;
  }

  if (payload.deviceId !== undefined && typeof payload.deviceId !== "string") {
    return { error: "deviceId must be a string" };
  }
  if (typeof payload.deviceId === "string") {
    input.deviceId = payload.deviceId;
  }

  const hasField = Object.keys(input).length > 0;
  if (!hasField) {
    return { error: "At least one field is required to update" };
  }

  return { input };
}
