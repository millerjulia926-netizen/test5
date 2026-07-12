export const MAX_TITLE_LENGTH = 200;
export const MAX_CONTENT_LENGTH = 100_000;
export const TRANSCRIPTION_REVIEW_THRESHOLD = 0.7;

export type CaptureSource = "typed" | "voice";

export type NoteFormValues = {
  title: string;
  content: string;
  captureSource?: CaptureSource;
  needsReview?: boolean;
  transcriptionConfidence?: number | null;
  pendingSync?: boolean;
};

export function validateNoteTitle(title: string): string | null {
  if (!title.trim()) {
    return "Title is required";
  }

  if (title.trim().length > MAX_TITLE_LENGTH) {
    return `Title must be at most ${MAX_TITLE_LENGTH} characters`;
  }

  return null;
}

export function validateNoteContent(content: string): string | null {
  if (content.length > MAX_CONTENT_LENGTH) {
    return `Content must be at most ${MAX_CONTENT_LENGTH} characters`;
  }

  return null;
}

export function validateNoteForm(values: NoteFormValues): string | null {
  const titleError = validateNoteTitle(values.title);
  if (titleError) {
    return titleError;
  }

  return validateNoteContent(values.content);
}

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

export function createOfflineDraft(values: NoteFormValues): NoteFormValues {
  return {
    ...values,
    pendingSync: true,
  };
}

export type VoiceCaptureResult = {
  content: string;
  captureSource: "voice";
  transcriptionConfidence: number;
  needsReview: boolean;
};

export function simulateVoiceCapture(existingContent: string): VoiceCaptureResult {
  const content = existingContent.trim()
    ? `${existingContent.trim()}\n\nTranscribed voice note.`
    : "Transcribed voice note.";
  const transcriptionConfidence = 0.42;
  const needsReview = applyVoiceCaptureRules({
    captureSource: "voice",
    transcriptionConfidence,
  }).needsReview;

  return {
    content,
    captureSource: "voice",
    transcriptionConfidence,
    needsReview,
  };
}
