import { Router } from "express";

import { requireAuth, type AuthenticatedRequest } from "../auth/middleware.js";

export function createHealthRouter(): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "test1-api" });
  });

  router.get("/me", requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  return router;
}
