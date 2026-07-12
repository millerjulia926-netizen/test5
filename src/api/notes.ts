import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { Router } from "express";

import { type AuthenticatedRequest, requireSession } from "../auth/middleware.js";
import type { Database } from "../db/client.js";
import { folders, noteVersions, notes } from "../db/schema.js";

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
    const showArchived = req.query.archived === "true";
    const conditions = [eq(notes.userId, req.userId!)];

    if (showArchived) {
      conditions.push(isNotNull(notes.archivedAt));
    } else {
      conditions.push(isNull(notes.archivedAt));
    }

    const userNotes = await db
      .select()
      .from(notes)
      .where(and(...conditions))
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

  router.patch("/:id", async (req: AuthenticatedRequest, res) => {
    const noteId = parseNoteId(req.params.id);
    if (!noteId) {
      res.status(400).json({ error: "Invalid note id" });
      return;
    }

    const {
      title,
      content,
      folderId,
      isPinned,
      archived,
      pendingSync,
      needsReview,
      captureSource,
      transcriptionConfidence,
      expectedUpdatedAt,
      deviceId,
    } = req.body ?? {};
    const parsedCaptureSource = parseCaptureSource(captureSource);
    const updates: Partial<typeof notes.$inferInsert> = {
      updatedAt: new Date(),
    };

    const [existingNote] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, req.userId!)));

    if (!existingNote) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    if (expectedUpdatedAt !== undefined) {
      if (typeof expectedUpdatedAt !== "string") {
        res.status(400).json({ error: "expectedUpdatedAt must be an ISO date string" });
        return;
      }

      const expectedTime = new Date(expectedUpdatedAt).getTime();
      if (Number.isNaN(expectedTime) || existingNote.updatedAt.getTime() !== expectedTime) {
        await db.insert(noteVersions).values({
          noteId: existingNote.id,
          title: typeof title === "string" && title.trim() ? title.trim() : existingNote.title,
          content: typeof content === "string" ? content : existingNote.content,
          deviceId: typeof deviceId === "string" ? deviceId : null,
        });
        await db.update(notes).set({ syncConflict: true }).where(eq(notes.id, noteId));

        res.status(409).json({
          error: "Note was updated on another device",
          note: existingNote,
        });
        return;
      }
    }

    if (parsedCaptureSource === null) {
      res.status(400).json({ error: "captureSource must be 'typed' or 'voice'" });
      return;
    }

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        res.status(400).json({ error: "Title must be a non-empty string" });
        return;
      }
      updates.title = title.trim();
    }

    if (content !== undefined) {
      if (typeof content !== "string") {
        res.status(400).json({ error: "Content must be a string" });
        return;
      }
      updates.content = content;
    }

    if (folderId !== undefined) {
      if (folderId !== null && typeof folderId !== "string") {
        res.status(400).json({ error: "folderId must be a string or null" });
        return;
      }

      if (folderId !== null && !(await folderBelongsToUser(db, req.userId!, folderId))) {
        res.status(400).json({ error: "Folder not found" });
        return;
      }

      updates.folderId = folderId;
    }

    if (isPinned !== undefined) {
      if (typeof isPinned !== "boolean") {
        res.status(400).json({ error: "isPinned must be a boolean" });
        return;
      }
      updates.isPinned = isPinned;
    }

    if (archived !== undefined) {
      if (typeof archived !== "boolean") {
        res.status(400).json({ error: "archived must be a boolean" });
        return;
      }
      updates.archivedAt = archived ? new Date() : null;
      if (archived) {
        updates.isPinned = false;
      }
    }

    if (pendingSync !== undefined) {
      if (typeof pendingSync !== "boolean") {
        res.status(400).json({ error: "pendingSync must be a boolean" });
        return;
      }
      updates.pendingSync = pendingSync;
    }

    if (needsReview !== undefined) {
      if (typeof needsReview !== "boolean") {
        res.status(400).json({ error: "needsReview must be a boolean" });
        return;
      }
      updates.needsReview = needsReview;
    }

    if (parsedCaptureSource !== undefined) {
      updates.captureSource = parsedCaptureSource;
    }

    if (transcriptionConfidence !== undefined) {
      if (typeof transcriptionConfidence !== "number") {
        res.status(400).json({ error: "transcriptionConfidence must be a number" });
        return;
      }
      updates.transcriptionConfidence = transcriptionConfidence;
    }

    if (Object.keys(updates).length === 1) {
      res.status(400).json({ error: "At least one field is required to update" });
      return;
    }

    const [note] = await db
      .update(notes)
      .set(updates)
      .where(and(eq(notes.id, noteId), eq(notes.userId, req.userId!)))
      .returning();

    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    res.json(note);
  });

  router.delete("/:id", async (req: AuthenticatedRequest, res) => {
    const noteId = parseNoteId(req.params.id);
    if (!noteId) {
      res.status(400).json({ error: "Invalid note id" });
      return;
    }

    const [deleted] = await db
      .delete(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, req.userId!)))
      .returning({ id: notes.id });

    if (!deleted) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    res.status(204).send();
  });

  return router;
}
