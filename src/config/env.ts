export type AppEnvironment = "development" | "staging" | "production";

export interface EnvConfig {
  nodeEnv: AppEnvironment;
  port: number;
  databaseUrl: string;
  sessionSecret: string;
  accessTokenExpiresMinutes: number;
  refreshTokenExpiresDays: number;
  sessionTimeoutMinutes: number;
}

const APP_ENVIRONMENTS: readonly AppEnvironment[] = ["development", "staging", "production"];

function parseAppEnvironment(value: string | undefined): AppEnvironment {
  if (value && APP_ENVIRONMENTS.includes(value as AppEnvironment)) {
    return value as AppEnvironment;
  }

  return "development";
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const defaults: Record<AppEnvironment, Omit<EnvConfig, "nodeEnv">> = {
  development: {
    port: 3000,
    databaseUrl: "postgres://localhost:5432/notes_dev",
    sessionSecret: "dev-secret-change-me",
    accessTokenExpiresMinutes: 15,
    refreshTokenExpiresDays: 7,
    sessionTimeoutMinutes: 30,
  },
  staging: {
    port: 3000,
    databaseUrl: "postgres://localhost:5432/notes_staging",
    sessionSecret: "staging-secret-change-me",
    accessTokenExpiresMinutes: 15,
    refreshTokenExpiresDays: 7,
    sessionTimeoutMinutes: 30,
  },
  production: {
    port: 3000,
    databaseUrl: "",
    sessionSecret: "",
    accessTokenExpiresMinutes: 15,
    refreshTokenExpiresDays: 7,
    sessionTimeoutMinutes: 30,
  },
};

export function loadEnv(overrideNodeEnv?: AppEnvironment): EnvConfig {
  const nodeEnv = overrideNodeEnv ?? parseAppEnvironment(process.env.NODE_ENV);
  const base = defaults[nodeEnv];

  if (nodeEnv === "production") {
    return {
      nodeEnv,
      port: Number(process.env.PORT ?? base.port),
      databaseUrl: requireEnv("DATABASE_URL"),
      sessionSecret: requireEnv("SESSION_SECRET"),
      accessTokenExpiresMinutes: Number(
        process.env.ACCESS_TOKEN_EXPIRES_MINUTES ?? base.accessTokenExpiresMinutes,
      ),
      refreshTokenExpiresDays: Number(
        process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? base.refreshTokenExpiresDays,
      ),
      sessionTimeoutMinutes: Number(
        process.env.SESSION_TIMEOUT_MINUTES ?? base.sessionTimeoutMinutes,
      ),
    };
  }

  return {
    nodeEnv,
    port: Number(process.env.PORT ?? base.port),
    databaseUrl: process.env.DATABASE_URL ?? base.databaseUrl,
    sessionSecret: process.env.SESSION_SECRET ?? base.sessionSecret,
    accessTokenExpiresMinutes: Number(
      process.env.ACCESS_TOKEN_EXPIRES_MINUTES ?? base.accessTokenExpiresMinutes,
    ),
    refreshTokenExpiresDays: Number(
      process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? base.refreshTokenExpiresDays,
    ),
    sessionTimeoutMinutes: Number(
      process.env.SESSION_TIMEOUT_MINUTES ?? base.sessionTimeoutMinutes,
    ),
  };
}

export const env = loadEnv();
