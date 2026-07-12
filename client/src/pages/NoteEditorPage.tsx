import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  createNote,
  fetchNote,
  SyncConflictError,
  updateNote,
} from "../api/notes";
import { useAuth } from "../auth/AuthContext";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { NoteEditor, type NoteEditorValues, type SaveStatus } from "../components/NoteEditor";
import { createOfflineDraft } from "../lib/validation";

export function NoteEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const mode = id ? "edit" : "create";

  const [initialValues, setInitialValues] = useState<NoteEditorValues>({
    title: "",
    content: "",
  });
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null);
  const [captureSource, setCaptureSource] = useState<"typed" | "voice">("typed");
  const [needsReview, setNeedsReview] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (mode === "create" || !id || !isAuthenticated) {
      return;
    }

    const noteId = id;
    let cancelled = false;

    async function loadNote() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const note = await fetchNote(noteId);
        if (cancelled) {
          return;
        }

        setInitialValues({ title: note.title, content: note.content });
        setCaptureSource(note.captureSource === "voice" ? "voice" : "typed");
        setNeedsReview(note.needsReview);
        setServerUpdatedAt(note.updatedAt);
        setSaveStatus("saved");
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load note");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadNote();

    return () => {
      cancelled = true;
    };
  }, [id, isAuthenticated, mode]);

  async function handleSave(values: NoteEditorValues) {
    setSaveStatus("saving");

    const payload =
      mode === "create" && !navigator.onLine
        ? createOfflineDraft(values)
        : values;

    try {
      const savedNote =
        mode === "edit" && id
          ? await updateNote(id, {
              title: payload.title,
              content: payload.content,
              expectedUpdatedAt: serverUpdatedAt ?? undefined,
              captureSource: payload.captureSource,
              needsReview: payload.needsReview,
              transcriptionConfidence: payload.transcriptionConfidence ?? undefined,
            })
          : await createNote({
              title: payload.title,
              content: payload.content,
              captureSource: payload.captureSource,
              needsReview: payload.needsReview,
              transcriptionConfidence: payload.transcriptionConfidence ?? undefined,
              pendingSync: payload.pendingSync,
            });

      setInitialValues({ title: savedNote.title, content: savedNote.content });
      setCaptureSource(savedNote.captureSource === "voice" ? "voice" : "typed");
      setNeedsReview(savedNote.needsReview);
      setServerUpdatedAt(savedNote.updatedAt);
      setSaveStatus("saved");

      if (mode === "create") {
        navigate(`/notes/${savedNote.id}`);
      }
    } catch (error) {
      if (error instanceof SyncConflictError) {
        setInitialValues({ title: error.note.title, content: error.note.content });
        setServerUpdatedAt(error.note.updatedAt);
        setSaveStatus("conflict");
        return;
      }

      setSaveStatus("error");
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading note..." />;
  }

  if (loadError) {
    return <ErrorState message={loadError} actionLabel="Back to notes" actionTo="/notes" />;
  }

  return (
    <NoteEditor
      key={`${mode}-${id ?? "new"}-${initialValues.title}`}
      mode={mode}
      initialTitle={initialValues.title}
      initialContent={initialValues.content}
      initialCaptureSource={captureSource}
      initialNeedsReview={needsReview}
      saveStatus={saveStatus}
      onChange={() => setSaveStatus("dirty")}
      onSave={handleSave}
      onCancel={() => navigate(-1)}
    />
  );
}
