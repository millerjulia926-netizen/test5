import { drizzle } from "drizzle-orm/node-postgres";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../app.js";
import { createDbPool } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import * as schema from "../db/schema.js";
import { getTestDatabaseUrl, isDatabaseAvailable, resetDatabase } from "../db/test-helpers.js";

const databaseUrl = getTestDatabaseUrl();
const dbAvailable = await isDatabaseAvailable(databaseUrl);

describe.runIf(dbAvailable)("notes pin and archive API", () => {
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

  async function signupAndGetToken(email: string) {
    const app = createApp({ db });
    const response = await request(app).post("/auth/signup").send({ email, password: "Password1" });

    return { app, token: response.body.accessToken as string };
  }

  it("pins a note", async () => {
    const { app, token } = await signupAndGetToken("alice@example.com");

    const created = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Pin me", content: "Important" });

    const pinned = await request(app)
      .patch(`/notes/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ isPinned: true });

    expect(pinned.status).toBe(200);
    expect(pinned.body.isPinned).toBe(true);
  });

  it("archives a note so it leaves the main list", async () => {
    const { app, token } = await signupAndGetToken("alice@example.com");

    const created = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "To archive", content: "Temporary" });

    const archived = await request(app)
      .patch(`/notes/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ archived: true });

    expect(archived.status).toBe(200);
    expect(archived.body.archivedAt).toBeTruthy();
    expect(archived.body.isPinned).toBe(false);

    const active = await request(app).get("/notes").set("Authorization", `Bearer ${token}`);
    expect(active.body).toHaveLength(0);

    const archivedList = await request(app)
      .get("/notes?archived=true")
      .set("Authorization", `Bearer ${token}`);

    expect(archivedList.body).toHaveLength(1);
    expect(archivedList.body[0].id).toBe(created.body.id);
  });

  it("restores an archived note back to the main list", async () => {
    const { app, token } = await signupAndGetToken("alice@example.com");

    const created = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Restore me", content: "Archived once" });

    await request(app)
      .patch(`/notes/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ archived: true });

    const restored = await request(app)
      .patch(`/notes/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ archived: false });

    expect(restored.status).toBe(200);
    expect(restored.body.archivedAt).toBeNull();

    const active = await request(app).get("/notes").set("Authorization", `Bearer ${token}`);
    expect(active.body).toHaveLength(1);
    expect(active.body[0].id).toBe(created.body.id);
  });
});
