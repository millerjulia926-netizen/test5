import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { Router } from "express";

import { type AuthenticatedRequest, requireSession } from "../auth/middleware.js";
import { folderBelongsToUser, getNoteForUser } from "../auth/authorization.js";
import type { Database } from "../db/client.js";
import { noteVersions, notes } from "../db/schema.js";
import {
  applyVoiceCaptureRules,
  resolvePendingSyncOnUpdate,
  validatePinArchiveRule,
} from "../notes/rules.js";
import { validateCreateNoteInput, validateUpdateNoteInput } from "../notes/validation.js";

function parseNoteId(rawId: string | string[]): string | null {
  return typeof rawId === "string" ? rawId : null;
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
    const validation = validateCreateNoteInput(req.body);
    if ("error" in validation) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const { input } = validation;

    if (input.folderId) {
      if (!(await folderBelongsToUser(db, req.userId!, input.folderId))) {
        res.status(400).json({ error: "Folder not found" });
        return;
      }
    }

    const captureSource = input.captureSource ?? "typed";
    const transcriptionConfidence = input.transcriptionConfidence ?? null;
    const voiceRules = applyVoiceCaptureRules({
      captureSource,
      transcriptionConfidence,
      needsReview: input.needsReview,
    });

    const [note] = await db
      .insert(notes)
      .values({
        userId: req.userId!,
        title: input.title,
        content: input.content,
        folderId: input.folderId ?? null,
        pendingSync: input.pendingSync ?? false,
        captureSource,
        needsReview: voiceRules.needsReview,
        transcriptionConfidence,
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

    const note = await getNoteForUser(db, noteId, req.userId!);

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

    const validation = validateUpdateNoteInput(req.body);
    if ("error" in validation) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const { input } = validation;
    const updates: Partial<typeof notes.$inferInsert> = {
      updatedAt: new Date(),
    };

    const existingNote = await getNoteForUser(db, noteId, req.userId!);

    if (!existingNote) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    if (input.expectedUpdatedAt !== undefined) {
      const expectedTime = new Date(input.expectedUpdatedAt).getTime();
      if (Number.isNaN(expectedTime) || existingNote.updatedAt.getTime() !== expectedTime) {
        await db.insert(noteVersions).values({
          noteId: existingNote.id,
          title: input.title ?? existingNote.title,
          content: input.content ?? existingNote.content,
          deviceId: input.deviceId ?? null,
        });
        await db.update(notes).set({ syncConflict: true }).where(eq(notes.id, noteId));

        res.status(409).json({
          error: "Note was updated on another device",
          note: existingNote,
        });
        return;
      }
    }

    const pinArchiveError = validatePinArchiveRule(existingNote, {
      isPinned: input.isPinned,
      archived: input.archived,
    });
    if (pinArchiveError) {
      res.status(400).json({ error: pinArchiveError });
      return;
    }

    if (input.title !== undefined) {
      updates.title = input.title;
    }

    if (input.content !== undefined) {
      updates.content = input.content;
    }

    if (input.folderId !== undefined) {
      if (input.folderId !== null && !(await folderBelongsToUser(db, req.userId!, input.folderId))) {
        res.status(400).json({ error: "Folder not found" });
        return;
      }

      updates.folderId = input.folderId;
    }

    if (input.isPinned !== undefined) {
      updates.isPinned = input.isPinned;
    }

    if (input.archived !== undefined) {
      updates.archivedAt = input.archived ? new Date() : null;
      if (input.archived) {
        updates.isPinned = false;
      }
    }

    const resolvedPendingSync = resolvePendingSyncOnUpdate(existingNote, input.pendingSync);
    if (resolvedPendingSync !== undefined) {
      updates.pendingSync = resolvedPendingSync;
    }

    const nextCaptureSource = input.captureSource ?? existingNote.captureSource;
    const nextConfidence =
      input.transcriptionConfidence !== undefined
        ? input.transcriptionConfidence
        : existingNote.transcriptionConfidence;

    if (input.captureSource !== undefined) {
      updates.captureSource = input.captureSource;
    }

    if (input.transcriptionConfidence !== undefined) {
      updates.transcriptionConfidence = input.transcriptionConfidence;
    }

    const voiceRules = applyVoiceCaptureRules({
      captureSource: nextCaptureSource as "typed" | "voice",
      transcriptionConfidence: nextConfidence,
      needsReview: input.needsReview ?? existingNote.needsReview,
    });

    if (input.needsReview !== undefined || input.captureSource !== undefined || input.transcriptionConfidence !== undefined) {
      updates.needsReview = voiceRules.needsReview;
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
