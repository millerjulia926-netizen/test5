import { useMemo, useState, type FormEvent } from "react";

import {
  applyVoiceCaptureRules,
  simulateVoiceCapture,
  validateNoteForm,
  type NoteFormValues,
} from "../lib/validation";
import { MarkdownContent } from "./MarkdownContent";

export type NoteEditorMode = "create" | "edit";
export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error" | "conflict";

export type NoteEditorValues = NoteFormValues;

export type NoteEditorProps = {
  mode: NoteEditorMode;
  initialTitle?: string;
  initialContent?: string;
  initialCaptureSource?: "typed" | "voice";
  initialNeedsReview?: boolean;
  saveStatus?: SaveStatus;
  onChange?: (values: NoteEditorValues) => void;
  onSave?: (values: NoteEditorValues) => void | Promise<void>;
  onCancel?: () => void;
};

function statusLabel(status: SaveStatus, isDirty: boolean): string | null {
  if (status === "saving") {
    return "Saving...";
  }
  if (status === "saved" && !isDirty) {
    return "All changes saved";
  }
  if (status === "error") {
    return "Save failed";
  }
  if (status === "conflict") {
    return "Updated on another device";
  }
  if (isDirty) {
    return "Unsaved changes";
  }
  return null;
}

export function NoteEditor({
  mode,
  initialTitle = "",
  initialContent = "",
  initialCaptureSource = "typed",
  initialNeedsReview = false,
  saveStatus = "idle",
  onChange,
  onSave,
  onCancel,
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [captureSource, setCaptureSource] = useState<"typed" | "voice">(initialCaptureSource);
  const [needsReview, setNeedsReview] = useState(initialNeedsReview);
  const [transcriptionConfidence, setTranscriptionConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDirty = useMemo(
    () =>
      title !== initialTitle ||
      content !== initialContent ||
      captureSource !== initialCaptureSource ||
      needsReview !== initialNeedsReview,
    [title, content, captureSource, needsReview, initialTitle, initialContent, initialCaptureSource, initialNeedsReview],
  );

  const statusText = statusLabel(saveStatus, isDirty);

  function buildValues(overrides: Partial<NoteEditorValues> = {}): NoteEditorValues {
    return {
      title: title.trim(),
      content,
      captureSource,
      needsReview,
      transcriptionConfidence,
      ...overrides,
    };
  }

  function emitChange(overrides: Partial<NoteEditorValues> = {}) {
    onChange?.(buildValues(overrides));
  }

  function handleVoiceCapture() {
    const voiceResult = simulateVoiceCapture(content);
    const reviewState = applyVoiceCaptureRules({
      captureSource: voiceResult.captureSource,
      transcriptionConfidence: voiceResult.transcriptionConfidence,
    });

    setContent(voiceResult.content);
    setCaptureSource(voiceResult.captureSource);
    setTranscriptionConfidence(voiceResult.transcriptionConfidence);
    setNeedsReview(reviewState.needsReview);
    emitChange({
      content: voiceResult.content,
      captureSource: voiceResult.captureSource,
      transcriptionConfidence: voiceResult.transcriptionConfidence,
      needsReview: reviewState.needsReview,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!onSave) {
      return;
    }

    const validationError = validateNoteForm(buildValues());
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    await onSave(buildValues());
  }

  return (
    <form className="note-editor" onSubmit={handleSubmit} data-testid="note-editor">
      <div className="note-editor__header">
        <h1>{mode === "create" ? "New note" : "Edit note"}</h1>
        {statusText ? (
          <span
            className={`note-editor__status note-editor__status--${saveStatus === "error" || saveStatus === "conflict" ? "error" : isDirty ? "dirty" : saveStatus}`}
            data-testid="save-status"
          >
            {statusText}
          </span>
        ) : null}
      </div>

      {needsReview ? (
        <p className="note-editor__review-banner" data-testid="needs-review-banner">
          This voice note needs review before sharing.
        </p>
      ) : null}

      {error ? <p className="note-editor__error">{error}</p> : null}

      <label className="note-editor__field">
        Title
        <input
          type="text"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            emitChange({ title: event.target.value });
          }}
          placeholder="Note title"
          aria-invalid={Boolean(error)}
        />
      </label>

      <div className="note-editor__split">
        <label className="note-editor__field">
          Content
          <textarea
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              emitChange({ content: event.target.value });
            }}
            placeholder="Start writing..."
            rows={12}
          />
        </label>

        <section className="note-editor__preview" aria-label="Markdown preview">
          <h2>Preview</h2>
          <MarkdownContent content={content} className="note-editor__preview-content" />
        </section>
      </div>

      <div className="note-editor__actions">
        <button type="button" onClick={handleVoiceCapture} disabled={saveStatus === "saving"}>
          Voice capture
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} disabled={saveStatus === "saving"}>
            Cancel
          </button>
        ) : null}
        {onSave ? (
          <button type="submit" disabled={saveStatus === "saving" || !isDirty}>
            {saveStatus === "saving" ? "Saving..." : "Save now"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
