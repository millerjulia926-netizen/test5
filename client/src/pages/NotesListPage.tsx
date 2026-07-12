import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AuthError, fetchNotes } from "../api/notes";
import { useAuth } from "../auth/AuthContext";
import { useOnlineSync } from "../hooks/useOnlineSync";
import { useSyncOnFocus } from "../hooks/useSyncOnFocus";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { NotesList } from "../components/NotesList";
import { getPendingCreates, mergeNotesWithPending } from "../lib/offlineQueue";
import { syncPendingNotes } from "../lib/sync";

type NotesListPageProps = {
  archived?: boolean;
};

export function NotesListPage({ archived = false }: NotesListPageProps) {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Awaited<ReturnType<typeof fetchNotes>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const loadNotes = useCallback(
    async (background = false) => {
      if (!isAuthenticated) {
        return;
      }

      if (!background) {
        setIsLoading(true);
      }
      setError(null);

      try {
        if (!archived) {
          setIsSyncing(true);
          await syncPendingNotes();
        }

        const data = await fetchNotes({ archived });
        const merged = archived ? data : mergeNotesWithPending(data, getPendingCreates());
        setNotes(merged);
      } catch (loadError) {
        if (loadError instanceof AuthError) {
          await logout();
          navigate("/login");
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load notes");
      } finally {
        setIsSyncing(false);
        if (!background) {
          setIsLoading(false);
        }
      }
    },
    [archived, isAuthenticated, logout, navigate],
  );

  useEffect(() => {
    void loadNotes();
  }, [loadNotes, reloadKey]);

  useOnlineSync(() => {
    void loadNotes(true);
  }, isAuthenticated && !archived);

  useSyncOnFocus(() => {
    void loadNotes(true);
  }, isAuthenticated);

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
    <>
      {isSyncing ? <p className="notes-list__sync-status">Syncing pending notes...</p> : null}
      <NotesList
        notes={notes}
        searchQuery={searchQuery}
        archived={archived}
        onSearchChange={setSearchQuery}
        onClearFilters={() => setSearchQuery("")}
      />
    </>
  );
}
