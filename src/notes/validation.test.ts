import { describe, expect, it } from "vitest";

import {
  MAX_CONTENT_LENGTH,
  MAX_TITLE_LENGTH,
  validateCreateNoteInput,
  validateTitle,
  validateTranscriptionConfidence,
  validateUpdateNoteInput,
} from "./validation.js";
import { applyVoiceCaptureRules, validatePinArchiveRule } from "./rules.js";

describe("note validation", () => {
  it("rejects missing titles", () => {
    expect(validateTitle("")).toBe("Title is required");
    expect(validateTitle("   ")).toBe("Title is required");
  });

  it("rejects titles that exceed the max length", () => {
    expect(validateTitle("a".repeat(MAX_TITLE_LENGTH + 1))).toMatch(/at most/);
  });

  it("rejects invalid transcription confidence", () => {
    expect(validateTranscriptionConfidence(1.5)).toMatch(/between 0 and 1/);
    expect(validateTranscriptionConfidence(-0.1)).toMatch(/between 0 and 1/);
    expect(validateTranscriptionConfidence("high")).toMatch(/must be a number/);
  });

  it("validates create note payloads", () => {
    const valid = validateCreateNoteInput({
      title: "Hello",
      content: "Body",
      captureSource: "voice",
      transcriptionConfidence: 0.5,
    });

    expect("input" in valid).toBe(true);
    if ("input" in valid) {
      expect(valid.input.captureSource).toBe("voice");
    }

    expect(validateCreateNoteInput({ title: "", content: "" })).toEqual({
      error: "Title is required",
    });
    expect(validateCreateNoteInput({ title: "Hi", captureSource: "audio" })).toEqual({
      error: "captureSource must be 'typed' or 'voice'",
    });
  });

  it("validates update note payloads", () => {
    expect(validateUpdateNoteInput({})).toEqual({
      error: "At least one field is required to update",
    });

    const tooLong = validateUpdateNoteInput({
      content: "x".repeat(MAX_CONTENT_LENGTH + 1),
    });
    expect(tooLong).toEqual({
      error: `Content must be at most ${MAX_CONTENT_LENGTH} characters`,
    });
  });
});

describe("note business rules", () => {
  it("flags low-confidence voice notes for review without blocking save", () => {
    expect(
      applyVoiceCaptureRules({
        captureSource: "voice",
        transcriptionConfidence: 0.42,
      }),
    ).toEqual({ needsReview: true });

    expect(
      applyVoiceCaptureRules({
        captureSource: "voice",
        transcriptionConfidence: 0.9,
      }),
    ).toEqual({ needsReview: false });
  });

  it("rejects pinning archived notes", () => {
    expect(
      validatePinArchiveRule({ archivedAt: new Date() }, { isPinned: true }),
    ).toBe("Archived notes cannot be pinned");
    expect(
      validatePinArchiveRule({ archivedAt: null }, { isPinned: true, archived: true }),
    ).toBe("Archived notes cannot be pinned");
    expect(validatePinArchiveRule({ archivedAt: null }, { isPinned: true })).toBeNull();
  });
});
