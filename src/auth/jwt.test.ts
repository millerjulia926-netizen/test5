import { describe, expect, it } from "vitest";

import { signAccessToken, verifyAccessToken } from "./jwt.js";

describe("jwt", () => {
  it("signs and verifies access tokens", () => {
    const token = signAccessToken({ sub: "user-1", email: "alice@example.com" });
    const payload = verifyAccessToken(token);

    expect(payload.sub).toBe("user-1");
    expect(payload.email).toBe("alice@example.com");
  });
});
