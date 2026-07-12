import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";
import type { Database } from "./db/client.js";

describe("app", () => {
  const db = {} as Database;

  it("responds to health checks", async () => {
    const app = createApp({ db });
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", service: "test1-api" });
  });

  it("returns 404 for unknown routes", async () => {
    const app = createApp({ db });
    const response = await request(app).get("/unknown");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Not found" });
  });
});
