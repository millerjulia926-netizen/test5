import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  AuthError,
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
import { enqueueCreate } from "../lib/offlineQueue";

export function NoteEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isRestoring, logout } = useAuth();
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
  const [conflictNote, setConflictNote] = useState<{ title: string; content: string } | null>(null);
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isRestoring && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, isRestoring, navigate]);

  useEffect(() => {
    if (mode === "create" || !id || !isAuthenticated) {
      return;
    }

    if (id.startsWith("local:")) {
      setLoadError("This note is saved offline. Edit it after it syncs to the server.");
      setIsLoading(false);
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
          if (error instanceof AuthError) {
            await logout();
            navigate("/login");
            return;
          }
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
  }, [id, isAuthenticated, logout, mode, navigate]);

  async function handleSave(values: NoteEditorValues, options?: { force?: boolean }) {
    setSaveStatus("saving");
    setOfflineMessage(null);
    setConflictNote(null);

    if (mode === "create" && !navigator.onLine) {
      const payload = createOfflineDraft(values);
      enqueueCreate({
        title: payload.title,
        content: payload.content,
        captureSource: payload.captureSource,
        needsReview: payload.needsReview,
        transcriptionConfidence: payload.transcriptionConfidence ?? null,
      });
      setInitialValues({ title: payload.title, content: payload.content });
      setSaveStatus("offline");
      setOfflineMessage("Saved offline. It will sync when you are back online.");
      return;
    }

    try {
      const savedNote =
        mode === "edit" && id
          ? await updateNote(id, {
              title: values.title,
              content: values.content,
              expectedUpdatedAt: options?.force ? undefined : (serverUpdatedAt ?? undefined),
              captureSource: values.captureSource,
              needsReview: values.needsReview,
              transcriptionConfidence: values.transcriptionConfidence ?? undefined,
            })
          : await createNote({
              title: values.title,
              content: values.content,
              captureSource: values.captureSource,
              needsReview: values.needsReview,
              transcriptionConfidence: values.transcriptionConfidence ?? undefined,
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
        setConflictNote({ title: error.note.title, content: error.note.content });
        setServerUpdatedAt(error.note.updatedAt);
        setSaveStatus("conflict");
        return;
      }

      if (error instanceof AuthError) {
        await logout();
        navigate("/login");
        return;
      }

      setSaveStatus("error");
    }
  }

  function handleAcceptServerVersion() {
    if (!conflictNote) {
      return;
    }

    setInitialValues({ title: conflictNote.title, content: conflictNote.content });
    setConflictNote(null);
    setSaveStatus("saved");
  }

  if (isLoading) {
    return <LoadingState message="Loading note..." />;
  }

  if (loadError) {
    return <ErrorState message={loadError} actionLabel="Back to notes" actionTo="/notes" />;
  }

  return (
    <>
      {offlineMessage ? <p className="note-editor__offline-banner">{offlineMessage}</p> : null}
      <NoteEditor
        key={`${mode}-${id ?? "new"}-${initialValues.title}-${saveStatus}`}
        mode={mode}
        initialTitle={initialValues.title}
        initialContent={initialValues.content}
        initialCaptureSource={captureSource}
        initialNeedsReview={needsReview}
        saveStatus={saveStatus}
        conflictNote={conflictNote}
        onChange={() => {
          if (saveStatus !== "dirty") {
            setSaveStatus("dirty");
          }
        }}
        onSave={(values) => handleSave(values)}
        onForceSave={(values) => handleSave(values, { force: true })}
        onAcceptServerVersion={handleAcceptServerVersion}
        onCancel={() => navigate(-1)}
      />
    </>
  );
}
