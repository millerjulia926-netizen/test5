import { describe, expect, it } from "vitest";

import { isResourceOwnedByUser } from "./authorization.js";

describe("authorization helpers", () => {
  it("allows access when the resource belongs to the requester", () => {
    expect(isResourceOwnedByUser("user-1", "user-1")).toBe(true);
  });

  it("denies access when the resource belongs to another user", () => {
    expect(isResourceOwnedByUser("user-1", "user-2")).toBe(false);
  });
});
