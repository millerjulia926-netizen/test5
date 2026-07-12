import { describe, expect, it } from "vitest";

import {
  applyVoiceCaptureRules,
  createOfflineDraft,
  simulateVoiceCapture,
  validateNoteForm,
  validateNoteTitle,
} from "./validation";

describe("client note validation", () => {
  it("requires a title", () => {
    expect(validateNoteTitle("")).toBe("Title is required");
    expect(validateNoteForm({ title: "", content: "" })).toBe("Title is required");
  });

  it("flags low-confidence voice notes for review", () => {
    expect(
      applyVoiceCaptureRules({
        captureSource: "voice",
        transcriptionConfidence: 0.2,
      }),
    ).toEqual({ needsReview: true });
  });

  it("marks offline drafts with pendingSync", () => {
    expect(
      createOfflineDraft({
        title: "Draft",
        content: "Offline",
      }),
    ).toEqual({
      title: "Draft",
      content: "Offline",
      pendingSync: true,
    });
  });

  it("simulates voice capture with review metadata", () => {
    const result = simulateVoiceCapture("");

    expect(result.captureSource).toBe("voice");
    expect(result.needsReview).toBe(true);
    expect(result.content).toContain("Transcribed voice note");
  });
});
