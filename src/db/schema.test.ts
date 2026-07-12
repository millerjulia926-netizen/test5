import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createDbPool } from "./client.js";
import { runMigrations } from "./migrate.js";
import * as schema from "./schema.js";
import { folders, noteTags, notes, noteVersions, tags, users } from "./schema.js";
import { getTestDatabaseUrl, isDatabaseAvailable, resetDatabase } from "./test-helpers.js";

const databaseUrl = getTestDatabaseUrl();
const dbAvailable = await isDatabaseAvailable(databaseUrl);

describe.runIf(dbAvailable)("database schema", () => {
  const pool = createDbPool(databaseUrl);
  const db = drizzle(pool, { schema });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await resetDatabase(databaseUrl);
    await runMigrations(databaseUrl);
  });

  it("applies the initial migration on a fresh database", async () => {
    const tables = await pool.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );

    expect(tables.rows.map((row) => row.tablename)).toEqual([
      "folders",
      "note_shares",
      "note_tags",
      "note_versions",
      "notes",
      "sessions",
      "tags",
      "users",
    ]);
  });

  it("enforces unique user emails", async () => {
    await db.insert(users).values({
      email: "alice@example.com",
      passwordHash: "hash",
    });

    await expect(
      db.insert(users).values({
        email: "alice@example.com",
        passwordHash: "hash-2",
      }),
    ).rejects.toThrow();
  });

  it("enforces unique folder names per user and parent", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: "alice@example.com", passwordHash: "hash" })
      .returning();

    await db.insert(folders).values({ userId: user.id, name: "Work" });

    await expect(db.insert(folders).values({ userId: user.id, name: "Work" })).rejects.toThrow();
  });

  it("enforces unique tag names per user", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: "alice@example.com", passwordHash: "hash" })
      .returning();

    await db.insert(tags).values({ userId: user.id, name: "important" });

    await expect(db.insert(tags).values({ userId: user.id, name: "important" })).rejects.toThrow();
  });

  it("links notes to folders and tags", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: "alice@example.com", passwordHash: "hash" })
      .returning();
    const [folder] = await db.insert(folders).values({ userId: user.id, name: "Work" }).returning();
    const [note] = await db
      .insert(notes)
      .values({ userId: user.id, folderId: folder.id, title: "Standup", content: "Notes" })
      .returning();
    const [tag] = await db.insert(tags).values({ userId: user.id, name: "meeting" }).returning();

    await db.insert(noteTags).values({ noteId: note.id, tagId: tag.id });

    const linked = await db
      .select({ noteTitle: notes.title, tagName: tags.name })
      .from(noteTags)
      .innerJoin(notes, eq(noteTags.noteId, notes.id))
      .innerJoin(tags, eq(noteTags.tagId, tags.id));

    expect(linked).toEqual([{ noteTitle: "Standup", tagName: "meeting" }]);
  });

  it("cascades user deletion to owned records", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: "alice@example.com", passwordHash: "hash" })
      .returning();
    await db.insert(notes).values({ userId: user.id, title: "Draft", content: "" });

    await db.delete(users).where(eq(users.id, user.id));

    const remainingNotes = await db.select().from(notes);
    expect(remainingNotes).toHaveLength(0);
  });

  it("sets note folder_id to null when folder is deleted", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: "alice@example.com", passwordHash: "hash" })
      .returning();
    const [folder] = await db
      .insert(folders)
      .values({ userId: user.id, name: "Archive" })
      .returning();
    const [note] = await db
      .insert(notes)
      .values({ userId: user.id, folderId: folder.id, title: "Old", content: "" })
      .returning();

    await db.delete(folders).where(eq(folders.id, folder.id));

    const [updatedNote] = await db.select().from(notes).where(eq(notes.id, note.id));
    expect(updatedNote.folderId).toBeNull();
  });

  it("stores offline notes with a pending sync flag", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: "alice@example.com", passwordHash: "hash" })
      .returning();

    const [note] = await db
      .insert(notes)
      .values({
        userId: user.id,
        title: "Offline draft",
        content: "Captured without network",
        pendingSync: true,
      })
      .returning();

    expect(note.pendingSync).toBe(true);
  });

  it("preserves conflicting note versions and flags sync conflicts", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: "alice@example.com", passwordHash: "hash" })
      .returning();
    const [note] = await db
      .insert(notes)
      .values({
        userId: user.id,
        title: "Shared note",
        content: "Current version",
        syncConflict: true,
      })
      .returning();

    await db.insert(noteVersions).values([
      {
        noteId: note.id,
        title: note.title,
        content: "Edited on phone",
        deviceId: "phone",
      },
      {
        noteId: note.id,
        title: note.title,
        content: "Edited on laptop",
        deviceId: "laptop",
      },
    ]);

    const versions = await db.select().from(noteVersions).where(eq(noteVersions.noteId, note.id));
    const [currentNote] = await db.select().from(notes).where(eq(notes.id, note.id));

    expect(currentNote.syncConflict).toBe(true);
    expect(versions).toHaveLength(2);
  });

  it("stores voice-captured notes with review metadata", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: "alice@example.com", passwordHash: "hash" })
      .returning();

    const [note] = await db
      .insert(notes)
      .values({
        userId: user.id,
        title: "Voice memo",
        content: "Transcribed text",
        captureSource: "voice",
        needsReview: true,
        transcriptionConfidence: 0.42,
      })
      .returning();

    expect(note.captureSource).toBe("voice");
    expect(note.needsReview).toBe(true);
    expect(note.transcriptionConfidence).toBeCloseTo(0.42);
  });
});
