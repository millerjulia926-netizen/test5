import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export type AccessTokenPayload = {
  sub: string;
  sessionId: string;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.sessionSecret, {
    expiresIn: `${env.accessTokenExpiresMinutes}m`,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.sessionSecret);

  if (typeof decoded === "string" || !decoded.sub || !decoded.sessionId) {
    throw new Error("Invalid access token");
  }

  return {
    sub: String(decoded.sub),
    sessionId: String(decoded.sessionId),
  };
}
