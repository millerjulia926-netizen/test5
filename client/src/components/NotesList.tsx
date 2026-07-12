import { Link } from "react-router-dom";

import type { Note } from "../api/notes";

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function preview(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return "No content yet";
  }
  return trimmed.length > 120 ? `${trimmed.slice(0, 120)}...` : trimmed;
}

export type NotesListProps = {
  notes: Note[];
  searchQuery?: string;
  archived?: boolean;
  onSearchChange?: (query: string) => void;
  onClearFilters?: () => void;
};

export function NotesList({
  notes,
  searchQuery = "",
  archived = false,
  onSearchChange,
  onClearFilters,
}: NotesListProps) {
  const filteredNotes = onSearchChange
    ? notes.filter((note) => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
          return true;
        }
        return (
          note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query)
        );
      })
    : notes;

  const hasActiveFilters = Boolean(searchQuery.trim());
  const heading = archived ? "Archived notes" : "Your notes";

  if (filteredNotes.length === 0) {
    return (
      <section className="notes-list notes-list--empty" data-testid="notes-list">
        <h1>{heading}</h1>
        {onSearchChange ? (
          <label className="notes-search">
            Search
            <input
              type="search"
              value={searchQuery}
              placeholder="Search titles and content"
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>
        ) : null}
        {hasActiveFilters ? (
          <>
            <p>No notes match the current filters.</p>
            {onClearFilters ? (
              <button type="button" className="notes-list__cta" onClick={onClearFilters}>
                Clear filters
              </button>
            ) : null}
          </>
        ) : archived ? (
          <p>You do not have any archived notes.</p>
        ) : (
          <p>You do not have any notes yet.</p>
        )}
        {!archived && !hasActiveFilters ? (
          <Link to="/notes/new" className="notes-list__cta">
            Create your first note
          </Link>
        ) : null}
        {!archived && !hasActiveFilters ? (
          <Link to="/notes/archived" className="notes-list__secondary-link">
            View archived notes
          </Link>
        ) : null}
        {archived && !hasActiveFilters ? (
          <Link to="/notes" className="notes-list__cta">
            Back to notes
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <section className="notes-list" data-testid="notes-list">
      <div className="notes-list__header">
        <h1>{heading}</h1>
        {archived ? <Link to="/notes">Back to notes</Link> : <Link to="/notes/new">New note</Link>}
      </div>

      {onSearchChange ? (
        <label className="notes-search">
          Search
          <input
            type="search"
            value={searchQuery}
            placeholder="Search titles and content"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
      ) : null}

      <ul className="notes-list__items">
        {filteredNotes.map((note) => (
          <li key={note.id}>
            <Link to={`/notes/${note.id}`} className="notes-list__item">
              <span className="notes-list__title">
                {note.isPinned ? <span className="notes-list__pin">Pinned</span> : null}
                {note.syncConflict ? <span className="notes-list__conflict">Conflict</span> : null}
                {note.needsReview ? <span className="notes-list__review">Review</span> : null}
                {note.title}
              </span>
              <span className="notes-list__preview">{preview(note.content)}</span>
              <span className="notes-list__meta">Updated {formatDate(note.updatedAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
