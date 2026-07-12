import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "./app.js";
import type { Database } from "./db/client.js";

describe("app", () => {
  const db = {} as Database;
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  function createTempClientDist(html = "<!doctype html><html><body>test1</body></html>") {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "test1-client-"));
    fs.writeFileSync(path.join(dir, "index.html"), html);
    tempDirs.push(dir);
    return dir;
  }

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

  it("serves the built client in production mode", async () => {
    const clientDistPath = createTempClientDist();
    const app = createApp({ db }, { clientDistPath });
    const response = await request(app).get("/login");

    expect(response.status).toBe(200);
    expect(response.text).toContain("test1");
  });
});
