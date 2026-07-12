import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../app.js";
import { createDbPool } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import * as schema from "../db/schema.js";
import { folders } from "../db/schema.js";
import { getTestDatabaseUrl, isDatabaseAvailable, resetDatabase } from "../db/test-helpers.js";
import { clearSentEmails } from "../services/email.js";

const databaseUrl = getTestDatabaseUrl();
const dbAvailable = await isDatabaseAvailable(databaseUrl);

describe.runIf(dbAvailable)("notes create/read API", () => {
  const pool = createDbPool(databaseUrl);
  const db = drizzle(pool, { schema });

  beforeAll(() => {
    vi.stubEnv("NODE_ENV", "test");
  });

  afterAll(async () => {
    await pool.end();
    vi.unstubAllEnvs();
  });

  beforeEach(async () => {
    clearSentEmails();
    await resetDatabase(databaseUrl);
    await runMigrations(databaseUrl);
  });

  async function createUser(email: string) {
    const app = createApp({ db });
    const signup = await request(app).post("/auth/signup").send({ email, password: "Password1" });

    return { app, token: signup.body.accessToken as string };
  }

  it("creates and reads a note", async () => {
    const { app, token } = await createUser("alice@example.com");

    const created = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "First note", content: "Hello" });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      title: "First note",
      content: "Hello",
    });

    const listed = await request(app).get("/notes").set("Authorization", `Bearer ${token}`);

    expect(listed.status).toBe(200);
    expect(listed.body).toHaveLength(1);

    const fetched = await request(app)
      .get(`/notes/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(fetched.status).toBe(200);
    expect(fetched.body.title).toBe("First note");
  });

  it("rejects unauthenticated create/read requests", async () => {
    const app = createApp({ db });

    expect((await request(app).get("/notes")).status).toBe(401);
    expect((await request(app).post("/notes").send({ title: "x" })).status).toBe(401);
    expect((await request(app).get("/notes/00000000-0000-0000-0000-000000000001")).status).toBe(
      401,
    );
  });

  it("prevents users from reading another user's note", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");

    const aliceNote = await request(alice.app)
      .post("/notes")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ title: "Alice private note" });

    const bobRead = await request(bob.app)
      .get(`/notes/${aliceNote.body.id}`)
      .set("Authorization", `Bearer ${bob.token}`);

    expect(bobRead.status).toBe(404);

    const aliceStillHasNote = await request(alice.app)
      .get(`/notes/${aliceNote.body.id}`)
      .set("Authorization", `Bearer ${alice.token}`);

    expect(aliceStillHasNote.status).toBe(200);
  });

  it("validates create payloads", async () => {
    const { app, token } = await createUser("alice@example.com");

    const missingTitle = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "No title" });

    expect(missingTitle.status).toBe(400);
  });

  it("assigns notes to folders owned by the user", async () => {
    const { app, token } = await createUser("alice@example.com");

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "alice@example.com"));
    const [folder] = await db.insert(folders).values({ userId: user.id, name: "Work" }).returning();

    const created = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "In folder", folderId: folder.id });

    expect(created.status).toBe(201);
    expect(created.body.folderId).toBe(folder.id);

    const invalidFolder = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Bad folder",
        folderId: "00000000-0000-0000-0000-000000000099",
      });

    expect(invalidFolder.status).toBe(400);
  });

  it("creates offline notes with a pending sync flag", async () => {
    const { app, token } = await createUser("alice@example.com");

    const created = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Offline draft",
        content: "Captured without network",
        pendingSync: true,
      });

    expect(created.status).toBe(201);
    expect(created.body.pendingSync).toBe(true);
  });

  it("creates voice-captured notes with review metadata", async () => {
    const { app, token } = await createUser("alice@example.com");

    const created = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Voice memo",
        content: "Transcribed text",
        captureSource: "voice",
        needsReview: true,
        transcriptionConfidence: 0.42,
      });

    expect(created.status).toBe(201);
    expect(created.body.captureSource).toBe("voice");
    expect(created.body.needsReview).toBe(true);
    expect(created.body.transcriptionConfidence).toBeCloseTo(0.42);
  });
});
