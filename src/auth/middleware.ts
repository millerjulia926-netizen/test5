import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "./jwt.js";
import { getSessionUserId } from "./service.js";
import type { Database } from "../db/client.js";

export type AuthenticatedRequest = Request & {
  userId?: string;
  sessionId?: string;
};

export function requireSession(db: Database) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    try {
      const accessToken = header.slice("Bearer ".length);
      const payload = verifyAccessToken(accessToken);
      const userId = await getSessionUserId(db, payload.sessionId);

      if (!userId || userId !== payload.sub) {
        res.status(401).json({ error: "Session expired" });
        return;
      }

      req.userId = userId;
      req.sessionId = payload.sessionId;
      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired access token" });
    }
  };
}
