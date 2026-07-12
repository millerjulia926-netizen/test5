import { describe, expect, it } from "vitest";

import { validateEmail, validatePassword } from "./validation.js";

describe("auth validation", () => {
  it("requires a valid email", () => {
    expect(validateEmail("")).toBe("Email is required");
    expect(validateEmail("not-an-email")).toBe("Invalid email address");
    expect(validateEmail("alice@example.com")).toBeNull();
  });

  it("enforces password complexity", () => {
    expect(validatePassword("")).toBe("Password is required");
    expect(validatePassword("short")).toBe("Password must be at least 8 characters");
    expect(validatePassword("alllowercase1")).toBe("Password must include an uppercase letter");
    expect(validatePassword("NoNumbers")).toBe("Password must include a number");
    expect(validatePassword("Password1")).toBeNull();
  });
});
