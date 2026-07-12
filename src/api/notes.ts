import { and, desc, eq, isNull } from "drizzle-orm";
import { Router } from "express";

import { type AuthenticatedRequest, requireSession } from "../auth/middleware.js";
import type { Database } from "../db/client.js";
import { folders, notes } from "../db/schema.js";

function parseNoteId(rawId: string | string[]): string | null {
  return typeof rawId === "string" ? rawId : null;
}

async function folderBelongsToUser(
  db: Database,
  userId: string,
  folderId: string,
): Promise<boolean> {
  const [folder] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)));

  return Boolean(folder);
}

function parseCaptureSource(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === "typed" || value === "voice") {
    return value;
  }

  return null;
}

export function createNotesRouter(db: Database) {
  const router = Router();

  router.use(requireSession(db));

  router.get("/", async (req: AuthenticatedRequest, res) => {
    const userNotes = await db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, req.userId!), isNull(notes.archivedAt)))
      .orderBy(desc(notes.updatedAt));

    res.json(userNotes);
  });

  router.post("/", async (req: AuthenticatedRequest, res) => {
    const {
      title,
      content,
      folderId,
      pendingSync,
      captureSource,
      needsReview,
      transcriptionConfidence,
    } = req.body ?? {};
    const parsedCaptureSource = parseCaptureSource(captureSource);

    if (!title || typeof title !== "string" || !title.trim()) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    if (parsedCaptureSource === null) {
      res.status(400).json({ error: "captureSource must be 'typed' or 'voice'" });
      return;
    }

    if (needsReview !== undefined && typeof needsReview !== "boolean") {
      res.status(400).json({ error: "needsReview must be a boolean" });
      return;
    }

    if (pendingSync !== undefined && typeof pendingSync !== "boolean") {
      res.status(400).json({ error: "pendingSync must be a boolean" });
      return;
    }

    if (transcriptionConfidence !== undefined && typeof transcriptionConfidence !== "number") {
      res.status(400).json({ error: "transcriptionConfidence must be a number" });
      return;
    }

    if (folderId !== undefined && folderId !== null) {
      if (typeof folderId !== "string") {
        res.status(400).json({ error: "folderId must be a string or null" });
        return;
      }

      if (!(await folderBelongsToUser(db, req.userId!, folderId))) {
        res.status(400).json({ error: "Folder not found" });
        return;
      }
    }

    const [note] = await db
      .insert(notes)
      .values({
        userId: req.userId!,
        title: title.trim(),
        content: typeof content === "string" ? content : "",
        folderId: folderId ?? null,
        pendingSync: pendingSync ?? false,
        captureSource: parsedCaptureSource ?? "typed",
        needsReview: needsReview ?? false,
        transcriptionConfidence:
          typeof transcriptionConfidence === "number" ? transcriptionConfidence : null,
      })
      .returning();

    res.status(201).json(note);
  });

  router.get("/:id", async (req: AuthenticatedRequest, res) => {
    const noteId = parseNoteId(req.params.id);
    if (!noteId) {
      res.status(400).json({ error: "Invalid note id" });
      return;
    }

    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, req.userId!)));

    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    res.json(note);
  });

  return router;
}
