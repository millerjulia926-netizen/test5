import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { deleteNote, fetchNote, updateNote } from "../api/notes";
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
  const { isAuthenticated } = useAuth();
  const [note, setNote] = useState<Awaited<ReturnType<typeof fetchNote>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !id) {
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
  }, [id, isAuthenticated]);

  async function handlePinToggle() {
    if (!note) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const updated = await updateNote(note.id, { isPinned: !note.isPinned });
      setNote(updated);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update note");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleArchiveToggle() {
    if (!note) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      if (note.archivedAt) {
        const updated = await updateNote(note.id, { archived: false });
        setNote(updated);
      } else {
        await updateNote(note.id, { archived: true });
        navigate("/notes");
      }
    } catch (updateError) {
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
      <h1>
        {note.isPinned ? <span className="notes-list__pin">Pinned</span> : null}
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
