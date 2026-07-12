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

describe.runIf(dbAvailable)("cross-device sync API", () => {
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

  async function loginSession(email: string) {
    const app = createApp({ db });
    const response = await request(app).post("/auth/signup").send({ email, password: "Password1" });

    return {
      app,
      accessToken: response.body.accessToken as string,
      refreshToken: response.body.refreshToken as string,
    };
  }

  it("converges note changes across two sessions for the same user", async () => {
    const deviceA = await loginSession("alice@example.com");
    const deviceB = await request(deviceA.app)
      .post("/auth/login")
      .send({ email: "alice@example.com", password: "Password1" });

    const deviceBToken = deviceB.body.accessToken as string;

    const created = await request(deviceA.app)
      .post("/notes")
      .set("Authorization", `Bearer ${deviceA.accessToken}`)
      .send({ title: "Phone draft", content: "Started on mobile" });

    const deviceBList = await request(deviceA.app)
      .get("/notes")
      .set("Authorization", `Bearer ${deviceBToken}`);

    expect(deviceBList.body).toHaveLength(1);
    expect(deviceBList.body[0].title).toBe("Phone draft");

    const updated = await request(deviceA.app)
      .patch(`/notes/${created.body.id}`)
      .set("Authorization", `Bearer ${deviceA.accessToken}`)
      .send({ content: "Finished on laptop" });

    expect(updated.status).toBe(200);

    const synced = await request(deviceA.app)
      .get(`/notes/${created.body.id}`)
      .set("Authorization", `Bearer ${deviceBToken}`);

    expect(synced.body.content).toBe("Finished on laptop");
  });

  it("refreshes tokens for the same user across devices", async () => {
    const deviceA = await loginSession("alice@example.com");

    const refreshed = await request(deviceA.app)
      .post("/auth/refresh")
      .send({ refreshToken: deviceA.refreshToken });

    expect(refreshed.status).toBe(200);

    const notes = await request(deviceA.app)
      .get("/notes")
      .set("Authorization", `Bearer ${refreshed.body.accessToken}`);

    expect(notes.status).toBe(200);
  });

  it("rejects stale updates with a conflict response", async () => {
    const deviceA = await loginSession("alice@example.com");
    const deviceB = await request(deviceA.app)
      .post("/auth/login")
      .send({ email: "alice@example.com", password: "Password1" });

    const created = await request(deviceA.app)
      .post("/notes")
      .set("Authorization", `Bearer ${deviceA.accessToken}`)
      .send({ title: "Shared note", content: "Version 1" });

    await request(deviceA.app)
      .patch(`/notes/${created.body.id}`)
      .set("Authorization", `Bearer ${deviceA.accessToken}`)
      .send({ content: "Version 2 from device A" });

    const conflict = await request(deviceA.app)
      .patch(`/notes/${created.body.id}`)
      .set("Authorization", `Bearer ${deviceB.body.accessToken}`)
      .send({
        content: "Version 2 from device B",
        expectedUpdatedAt: created.body.updatedAt,
      });

    expect(conflict.status).toBe(409);
    expect(conflict.body.error).toMatch(/another device/i);
    expect(conflict.body.note.content).toBe("Version 2 from device A");
  });
});
