import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../app.js";
import { createDbPool } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import * as schema from "../db/schema.js";
import { folders, users } from "../db/schema.js";
import { getTestDatabaseUrl, isDatabaseAvailable, resetDatabase } from "../db/test-helpers.js";

const databaseUrl = getTestDatabaseUrl();
const dbAvailable = await isDatabaseAvailable(databaseUrl);

describe.runIf(dbAvailable)("authorization checks", () => {
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
    await resetDatabase(databaseUrl);
    await runMigrations(databaseUrl);
  });

  async function signup(email: string) {
    const app = createApp({ db });
    const response = await request(app).post("/auth/signup").send({ email, password: "Password1" });
    return { app, token: response.body.accessToken as string };
  }

  it("rejects note mutations without authentication", async () => {
    const app = createApp({ db });

    expect((await request(app).post("/notes").send({ title: "Open note" })).status).toBe(401);
    expect(
      (await request(app).patch("/notes/00000000-0000-0000-0000-000000000001").send({ title: "x" }))
        .status,
    ).toBe(401);
    expect((await request(app).delete("/notes/00000000-0000-0000-0000-000000000001")).status).toBe(
      401,
    );
  });

  it("rejects access to another user's note", async () => {
    const alice = await signup("alice@example.com");
    const bob = await signup("bob@example.com");

    const aliceNote = await request(alice.app)
      .post("/notes")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ title: "Private note", content: "Secret" });

    const bobRead = await request(bob.app)
      .get(`/notes/${aliceNote.body.id}`)
      .set("Authorization", `Bearer ${bob.token}`);
    const bobUpdate = await request(bob.app)
      .patch(`/notes/${aliceNote.body.id}`)
      .set("Authorization", `Bearer ${bob.token}`)
      .send({ title: "Hijacked" });
    const bobDelete = await request(bob.app)
      .delete(`/notes/${aliceNote.body.id}`)
      .set("Authorization", `Bearer ${bob.token}`);

    expect(bobRead.status).toBe(404);
    expect(bobUpdate.status).toBe(404);
    expect(bobDelete.status).toBe(404);
  });

  it("rejects assigning notes to folders owned by another user", async () => {
    const alice = await signup("alice@example.com");
    await signup("bob@example.com");

    const [bobUser] = await db.select().from(users).where(eq(users.email, "bob@example.com"));
    const [folder] = await db
      .insert(folders)
      .values({ userId: bobUser.id, name: "Bob folder" })
      .returning();

    const invalid = await request(alice.app)
      .post("/notes")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ title: "Sneaky", folderId: folder.id });

    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toMatch(/folder/i);
  });

  it("rejects invalid bearer tokens", async () => {
    const app = createApp({ db });
    const response = await request(app)
      .get("/notes")
      .set("Authorization", "Bearer not-a-real-token");

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/token|authentication/i);
  });
});
