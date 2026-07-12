import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { AuthError, deleteNote, fetchNote, SyncConflictError, updateNote } from "../api/notes";
import { useAuth } from "../auth/AuthContext";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { MarkdownContent } from "../components/MarkdownContent";

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export function NoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [note, setNote] = useState<Awaited<ReturnType<typeof fetchNote>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    if (id.startsWith("local:")) {
      setError("This note is saved offline and will appear after sync.");
      setIsLoading(false);
      return;
    }

    const noteId = id;
    let cancelled = false;

    async function loadNote() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchNote(noteId);
        if (!cancelled) {
          setNote(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          if (loadError instanceof AuthError) {
            await logout();
            navigate("/login");
            return;
          }
          setError(loadError instanceof Error ? loadError.message : "Failed to load note");
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
  }, [id, logout, navigate]);

  async function mutateNote(input: Parameters<typeof updateNote>[1]) {
    if (!note) {
      return;
    }

    setIsUpdating(true);
    setError(null);
    setConflictMessage(null);

    try {
      const updated = await updateNote(note.id, {
        ...input,
        expectedUpdatedAt: note.updatedAt,
      });
      setNote(updated);
    } catch (updateError) {
      if (updateError instanceof SyncConflictError) {
        setNote(updateError.note);
        setConflictMessage("This note was updated on another device.");
        return;
      }

      if (updateError instanceof AuthError) {
        await logout();
        navigate("/login");
        return;
      }

      setError(updateError instanceof Error ? updateError.message : "Failed to update note");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handlePinToggle() {
    if (!note) {
      return;
    }

    await mutateNote({ isPinned: !note.isPinned });
  }

  async function handleArchiveToggle() {
    if (!note) {
      return;
    }

    if (note.archivedAt) {
      await mutateNote({ archived: false });
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      await updateNote(note.id, { archived: true, expectedUpdatedAt: note.updatedAt });
      navigate("/notes");
    } catch (updateError) {
      if (updateError instanceof SyncConflictError) {
        setNote(updateError.note);
        setConflictMessage("This note was updated on another device.");
        return;
      }

      setError(updateError instanceof Error ? updateError.message : "Failed to update note");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    if (!note) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      await deleteNote(note.id);
      navigate("/notes");
    } catch (deleteError) {
      if (deleteError instanceof AuthError) {
        await logout();
        navigate("/login");
        return;
      }

      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete note");
    } finally {
      setIsUpdating(false);
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading note..." />;
  }

  if (error || !note) {
    return (
      <ErrorState
        message={error ?? "Note not found"}
        actionLabel="Back to notes"
        actionTo="/notes"
      />
    );
  }

  return (
    <article className="note-detail" data-testid="note-detail">
      <div className="note-detail__header">
        <Link to={note.archivedAt ? "/notes/archived" : "/notes"} className="note-detail__back">
          {note.archivedAt ? "Back to archived" : "Back to notes"}
        </Link>
        <div className="note-detail__actions">
          {!note.archivedAt ? (
            <button type="button" disabled={isUpdating} onClick={() => void handlePinToggle()}>
              {note.isPinned ? "Unpin" : "Pin"}
            </button>
          ) : null}
          <Link to={`/notes/${note.id}/edit`} className="note-detail__edit">
            Edit
          </Link>
          <button type="button" disabled={isUpdating} onClick={() => void handleArchiveToggle()}>
            {note.archivedAt ? "Restore" : "Archive"}
          </button>
          <button type="button" disabled={isUpdating} onClick={() => void handleDelete()}>
            Delete
          </button>
        </div>
      </div>
      {conflictMessage ? <p className="note-detail__conflict">{conflictMessage}</p> : null}
      <h1>
        {note.isPinned ? <span className="notes-list__pin">Pinned</span> : null}
        {note.pendingSync ? <span className="notes-list__pending">Pending sync</span> : null}
        {note.syncConflict ? <span className="notes-list__conflict">Conflict</span> : null}
        {note.needsReview ? <span className="notes-list__review">Needs review</span> : null}
        {note.title}
      </h1>
      <p className="note-detail__meta">Updated {formatDate(note.updatedAt)}</p>
      {note.archivedAt ? (
        <p className="note-detail__meta">Archived {formatDate(note.archivedAt)}</p>
      ) : null}
      <MarkdownContent content={note.content} className="note-detail__content" />
    </article>
  );
}
