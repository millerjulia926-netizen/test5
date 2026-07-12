import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../app.js";
import { env } from "../config/env.js";
import { createDbPool } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import * as schema from "../db/schema.js";
import { sessions } from "../db/schema.js";
import { getTestDatabaseUrl, isDatabaseAvailable, resetDatabase } from "../db/test-helpers.js";
import { clearSentEmails } from "../services/email.js";

const databaseUrl = getTestDatabaseUrl();
const dbAvailable = await isDatabaseAvailable(databaseUrl);

describe.runIf(dbAvailable)("auth and session wiring", () => {
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

  async function signupUser(email: string, password = "Password1") {
    const app = createApp({ db });
    const response = await request(app).post("/auth/signup").send({ email, password });
    return { app, response };
  }

  it("creates an account and returns session tokens", async () => {
    const { response } = await signupUser("alice@example.com");

    expect(response.status).toBe(201);
    expect(response.body.accessToken).toBeTypeOf("string");
    expect(response.body.refreshToken).toBeTypeOf("string");
  });

  it("rejects duplicate email signups", async () => {
    await signupUser("alice@example.com");
    const { response } = await signupUser("alice@example.com");

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/already exists/i);
  });

  it("rejects weak passwords", async () => {
    const { response } = await signupUser("alice@example.com", "short");

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/password/i);
  });

  it("authenticates valid credentials and starts a session", async () => {
    await signupUser("alice@example.com");
    const app = createApp({ db });
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "alice@example.com", password: "Password1" });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeTypeOf("string");
    expect(response.body.refreshToken).toBeTypeOf("string");
  });

  it("denies invalid credentials without revealing which field failed", async () => {
    await signupUser("alice@example.com");
    const app = createApp({ db });

    const wrongPassword = await request(app)
      .post("/auth/login")
      .send({ email: "alice@example.com", password: "WrongPass1" });
    const wrongEmail = await request(app)
      .post("/auth/login")
      .send({ email: "missing@example.com", password: "Password1" });

    expect(wrongPassword.status).toBe(401);
    expect(wrongEmail.status).toBe(401);
    expect(wrongPassword.body.error).toBe(wrongEmail.body.error);
  });

  it("rejects unauthenticated note access", async () => {
    const app = createApp({ db });
    const response = await request(app).get("/notes");

    expect(response.status).toBe(401);
  });

  it("scopes notes to the authenticated user", async () => {
    const { response: aliceSignup } = await signupUser("alice@example.com");
    const { response: bobSignup } = await signupUser("bob@example.com");
    const app = createApp({ db });

    const aliceNote = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${aliceSignup.body.accessToken}`)
      .send({ title: "Alice note", content: "secret" });

    await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${bobSignup.body.accessToken}`)
      .send({ title: "Bob note", content: "private" });

    const aliceNotes = await request(app)
      .get("/notes")
      .set("Authorization", `Bearer ${aliceSignup.body.accessToken}`);

    expect(aliceNotes.body).toHaveLength(1);
    expect(aliceNotes.body[0].id).toBe(aliceNote.body.id);
  });

  it("rejects cross-user note access", async () => {
    const { response: aliceSignup } = await signupUser("alice@example.com");
    const { response: bobSignup } = await signupUser("bob@example.com");
    const app = createApp({ db });

    const aliceNote = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${aliceSignup.body.accessToken}`)
      .send({ title: "Alice note" });

    const crossUserRead = await request(app)
      .get(`/notes/${aliceNote.body.id}`)
      .set("Authorization", `Bearer ${bobSignup.body.accessToken}`);

    expect(crossUserRead.status).toBe(404);
  });

  it("logs out idle sessions beyond the configured timeout", async () => {
    vi.stubEnv("SESSION_TIMEOUT_MINUTES", "30");

    const { response } = await signupUser("alice@example.com");
    const payload = jwt.decode(response.body.accessToken) as { sessionId: string };

    const idleTime = new Date();
    idleTime.setMinutes(idleTime.getMinutes() - 31);
    await db
      .update(sessions)
      .set({ lastActivityAt: idleTime })
      .where(eq(sessions.id, payload.sessionId));

    const app = createApp({ db });
    const notesResponse = await request(app)
      .get("/notes")
      .set("Authorization", `Bearer ${response.body.accessToken}`);

    expect(notesResponse.status).toBe(401);
    expect(notesResponse.body.error).toMatch(/session expired/i);
  });

  it("refreshes tokens for a valid session", async () => {
    const { app, response } = await signupUser("alice@example.com");

    const refresh = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: response.body.refreshToken });

    expect(refresh.status).toBe(200);
    expect(refresh.body.accessToken).toBeTruthy();
    expect(refresh.body.refreshToken).toBeTruthy();
    expect(refresh.body.refreshToken).not.toBe(response.body.refreshToken);

    const notes = await request(app)
      .get("/notes")
      .set("Authorization", `Bearer ${refresh.body.accessToken}`);

    expect(notes.status).toBe(200);
  });

  it("rejects expired access tokens until refreshed", async () => {
    const { app, response } = await signupUser("alice@example.com");
    const expiredToken = jwt.sign(
      {
        sub: jwt.decode(response.body.accessToken)?.sub,
        sessionId: (jwt.decode(response.body.accessToken) as { sessionId: string }).sessionId,
      },
      env.sessionSecret,
      { expiresIn: "-1s" },
    );

    const protectedResponse = await request(app)
      .get("/notes")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(protectedResponse.status).toBe(401);

    const refreshResponse = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: response.body.refreshToken });

    expect(refreshResponse.status).toBe(200);

    const notesResponse = await request(app)
      .get("/notes")
      .set("Authorization", `Bearer ${refreshResponse.body.accessToken}`);

    expect(notesResponse.status).toBe(200);
  });
});
