import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchNotes } from "../api/notes";
import { useAuth } from "../auth/AuthContext";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { NotesList } from "../components/NotesList";

type NotesListPageProps = {
  archived?: boolean;
};

export function NotesListPage({ archived = false }: NotesListPageProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Awaited<ReturnType<typeof fetchNotes>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;

    async function loadNotes() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchNotes({ archived });
        if (!cancelled) {
          setNotes(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load notes");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadNotes();

    return () => {
      cancelled = true;
    };
  }, [archived, isAuthenticated, reloadKey]);

  if (isLoading) {
    return <LoadingState message={archived ? "Loading archived notes..." : "Loading notes..."} />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        actionLabel="Try again"
        onAction={() => setReloadKey((value) => value + 1)}
      />
    );
  }

  return (
    <NotesList
      notes={notes}
      searchQuery={searchQuery}
      archived={archived}
      onSearchChange={setSearchQuery}
      onClearFilters={() => setSearchQuery("")}
    />
  );
}
