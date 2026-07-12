import { Router } from "express";

import type { AppDependencies } from "../app.js";
import { type AuthenticatedRequest, requireSession } from "../auth/middleware.js";

export function createHealthRouter(deps: AppDependencies): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "test1-api" });
  });

  router.get("/me", requireSession(deps.db), (req: AuthenticatedRequest, res) => {
    res.json({ userId: req.userId, sessionId: req.sessionId });
  });

  return router;
}
