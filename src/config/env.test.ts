import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type AppEnvironment, loadEnv } from "./env.js";

const ENV_KEYS = ["NODE_ENV", "PORT", "DATABASE_URL", "SESSION_SECRET"] as const;

function snapshotEnv(): Record<(typeof ENV_KEYS)[number], string | undefined> {
  return {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
  };
}

function restoreEnv(snapshot: Record<(typeof ENV_KEYS)[number], string | undefined>): void {
  for (const key of ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("env config", () => {
  let envSnapshot: Record<(typeof ENV_KEYS)[number], string | undefined>;

  beforeEach(() => {
    envSnapshot = snapshotEnv();
  });

  afterEach(() => {
    restoreEnv(envSnapshot);
  });

  it.each<AppEnvironment>(["development", "staging", "production"])(
    "loads config for %s",
    (nodeEnv) => {
      process.env.NODE_ENV = nodeEnv;

      if (nodeEnv === "production") {
        process.env.DATABASE_URL = "postgres://prod.example.com/notes";
        process.env.SESSION_SECRET = "prod-secret";
      } else {
        delete process.env.DATABASE_URL;
        delete process.env.SESSION_SECRET;
      }

      const config = loadEnv();

      expect(config.nodeEnv).toBe(nodeEnv);
      expect(config.port).toBeGreaterThan(0);
      expect(config.databaseUrl).toBeTruthy();
      expect(config.sessionSecret).toBeTruthy();
    },
  );
});
