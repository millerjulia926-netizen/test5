import { eq } from "drizzle-orm";

import { signAccessToken } from "./jwt.js";
import { hashPassword, verifyPassword } from "./password.js";
import { createRefreshToken, hashToken } from "./tokens.js";
import { validateEmail, validatePassword } from "./validation.js";
import { env } from "../config/env.js";
import type { Database } from "../db/client.js";
import { sessions, users } from "../db/schema.js";
import { sendConfirmationEmail } from "../services/email.js";

const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

function refreshExpiryDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.refreshTokenExpiresDays);
  return expiresAt;
}

async function createSession(db: Database, userId: string): Promise<AuthTokens> {
  const refreshToken = createRefreshToken();
  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiryDate(),
    })
    .returning();

  return {
    accessToken: signAccessToken({ sub: userId, sessionId: session.id }),
    refreshToken,
  };
}

export async function signup(
  db: Database,
  input: { email: string; password: string },
): Promise<{ tokens: AuthTokens } | { error: string }> {
  const emailError = validateEmail(input.email);
  if (emailError) {
    return { error: emailError };
  }

  const passwordError = validatePassword(input.password);
  if (passwordError) {
    return { error: passwordError };
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await db.select().from(users).where(eq(users.email, normalizedEmail));

  if (existing.length > 0) {
    return { error: "An account with this email already exists" };
  }

  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({ email: normalizedEmail, passwordHash })
    .returning();

  await sendConfirmationEmail(user.email);
  const tokens = await createSession(db, user.id);

  return { tokens };
}

export async function login(
  db: Database,
  input: { email: string; password: string },
): Promise<{ tokens: AuthTokens } | { error: string }> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    return { error: INVALID_CREDENTIALS_MESSAGE };
  }

  const tokens = await createSession(db, user.id);
  return { tokens };
}

export async function logout(db: Database, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function refreshSession(
  db: Database,
  refreshToken: string,
): Promise<{ tokens: AuthTokens } | { error: string }> {
  const refreshTokenHash = hashToken(refreshToken);
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.refreshTokenHash, refreshTokenHash));

  if (!session || session.expiresAt < new Date()) {
    return { error: "Session expired" };
  }

  const idleDeadline = new Date(session.lastActivityAt);
  idleDeadline.setMinutes(idleDeadline.getMinutes() + env.sessionTimeoutMinutes);

  if (idleDeadline < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return { error: "Session expired due to inactivity" };
  }

  const newRefreshToken = createRefreshToken();
  const [updatedSession] = await db
    .update(sessions)
    .set({
      refreshTokenHash: hashToken(newRefreshToken),
      lastActivityAt: new Date(),
      expiresAt: refreshExpiryDate(),
    })
    .where(eq(sessions.id, session.id))
    .returning();

  return {
    tokens: {
      accessToken: signAccessToken({ sub: session.userId, sessionId: updatedSession.id }),
      refreshToken: newRefreshToken,
    },
  };
}

export async function getSessionUserId(db: Database, sessionId: string): Promise<string | null> {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  const idleDeadline = new Date(session.lastActivityAt);
  idleDeadline.setMinutes(idleDeadline.getMinutes() + env.sessionTimeoutMinutes);

  if (idleDeadline < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return null;
  }

  return session.userId;
}
