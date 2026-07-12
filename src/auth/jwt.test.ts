import { describe, expect, it } from "vitest";

import { signAccessToken, verifyAccessToken } from "./jwt.js";

describe("jwt", () => {
  it("signs and verifies access tokens", () => {
    const token = signAccessToken({ sub: "user-1", sessionId: "session-1" });
    const payload = verifyAccessToken(token);

    expect(payload.sub).toBe("user-1");
    expect(payload.sessionId).toBe("session-1");
  });
});
