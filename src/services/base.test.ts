import { describe, expect, it } from "vitest";

import type { Database } from "../db/client.js";
import { BaseService } from "./base.js";
import { createServiceContext } from "./context.js";

class TestService extends BaseService {
  getDatabase() {
    return this.db;
  }
}

describe("BaseService", () => {
  it("exposes the database from the service context", () => {
    const db = { query: "mock" } as unknown as Database;
    const service = new TestService(createServiceContext(db));

    expect(service.getDatabase()).toBe(db);
  });
});
