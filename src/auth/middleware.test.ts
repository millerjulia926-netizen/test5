import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import type { Database } from "../db/client.js";
import { signAccessToken } from "./jwt.js";

describe("requireAuth", () => {
  const db = {} as Database;

  it("rejects requests without a bearer token", async () => {
    const app = createApp({ db });
    const response = await request(app).get("/me");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Missing or invalid authorization header" });
  });

  it("accepts valid bearer tokens", async () => {
    const token = signAccessToken({ sub: "user-1", email: "alice@example.com" });
    const app = createApp({ db });
    const response = await request(app).get("/me").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: { id: "user-1", email: "alice@example.com" },
    });
  });

  it("rejects invalid bearer tokens", async () => {
    const app = createApp({ db });
    const response = await request(app).get("/me").set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid or expired token" });
  });
});
