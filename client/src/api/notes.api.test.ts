import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch, clearTokens, setTokens, SyncConflictError } from "./notes";

describe("apiFetch sync behavior", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url === "/auth/refresh" && method === "POST") {
          return new Response(
            JSON.stringify({ accessToken: "new-access-token", refreshToken: "new-refresh-token" }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        if (url === "/notes" && method === "GET") {
          const headers = new Headers(init?.headers);
          if (headers.get("Authorization") === "Bearer expired-token") {
            return new Response(JSON.stringify({ error: "Invalid or expired access token" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url === "/notes/note-1" && method === "PATCH") {
          return new Response(
            JSON.stringify({
              error: "Note was updated on another device",
              note: {
                id: "note-1",
                userId: "user-1",
                folderId: null,
                title: "Server title",
                content: "Server content",
                isPinned: false,
                archivedAt: null,
                pendingSync: false,
                syncConflict: true,
                captureSource: "typed",
                needsReview: false,
                transcriptionConfidence: null,
                createdAt: "2026-07-11T10:00:00.000Z",
                updatedAt: "2026-07-11T10:05:00.000Z",
              },
            }),
            { status: 409, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearTokens();
  });

  it("refreshes an expired access token and retries the request", async () => {
    setTokens({ accessToken: "expired-token", refreshToken: "valid-refresh-token" });

    const notes = await apiFetch<[]>("/notes");

    expect(notes).toEqual([]);
    expect(localStorage.getItem("notes_access_token")).toBe("new-access-token");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("throws a sync conflict error with the server note", async () => {
    setTokens({ accessToken: "valid-token", refreshToken: "valid-refresh-token" });

    await expect(
      apiFetch("/notes/note-1", {
        method: "PATCH",
        body: JSON.stringify({ content: "Local edit" }),
      }),
    ).rejects.toBeInstanceOf(SyncConflictError);
  });
});
