export type Note = {
  id: string;
  userId: string;
  folderId: string | null;
  title: string;
  content: string;
  isPinned: boolean;
  archivedAt: string | null;
  pendingSync: boolean;
  syncConflict: boolean;
  captureSource: string;
  needsReview: boolean;
  transcriptionConfidence: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export class SyncConflictError extends Error {
  note: Note;

  constructor(message: string, note: Note) {
    super(message);
    this.name = "SyncConflictError";
    this.note = note;
  }
}

const TOKEN_KEY = "notes_access_token";
const REFRESH_KEY = "notes_refresh_token";

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setTokens(tokens: AuthTokens): void {
  localStorage.setItem(TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(path, { ...init, headers });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      note?: Note;
    };

    if (response.status === 409 && body.note) {
      throw new SyncConflictError(body.error ?? "Sync conflict", body.note);
    }

    throw new Error(body.error ?? `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function restoreSession(): Promise<boolean> {
  return Boolean(getAccessToken());
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  return apiFetch<AuthTokens>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signup(email: string, password: string): Promise<AuthTokens> {
  return apiFetch<AuthTokens>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchNotes(filters?: { archived?: boolean }): Promise<Note[]> {
  const params = new URLSearchParams();
  if (filters?.archived) {
    params.set("archived", "true");
  }

  const query = params.toString();
  return apiFetch<Note[]>(`/notes${query ? `?${query}` : ""}`);
}

export async function fetchNote(id: string): Promise<Note> {
  return apiFetch<Note>(`/notes/${id}`);
}

export async function createNote(input: {
  title: string;
  content: string;
  captureSource?: "typed" | "voice";
  needsReview?: boolean;
  transcriptionConfidence?: number;
  pendingSync?: boolean;
}): Promise<Note> {
  return apiFetch<Note>("/notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateNote(
  id: string,
  input: {
    title?: string;
    content?: string;
    isPinned?: boolean;
    archived?: boolean;
    expectedUpdatedAt?: string;
    needsReview?: boolean;
    captureSource?: "typed" | "voice";
    transcriptionConfidence?: number;
    pendingSync?: boolean;
  },
): Promise<Note> {
  return apiFetch<Note>(`/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteNote(id: string): Promise<void> {
  return apiFetch<void>(`/notes/${id}`, { method: "DELETE" });
}
