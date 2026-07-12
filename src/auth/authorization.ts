import { and, eq } from "drizzle-orm";

import type { Database } from "../db/client.js";
import { folders, notes } from "../db/schema.js";

export function isResourceOwnedByUser(resourceUserId: string, requestUserId: string): boolean {
  return resourceUserId === requestUserId;
}

export async function folderBelongsToUser(
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

export async function getNoteForUser(
  db: Database,
  noteId: string,
  userId: string,
): Promise<typeof notes.$inferSelect | null> {
  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));

  return note ?? null;
}
