import { Router } from "express";

import { login, logout, refreshSession, signup } from "../auth/service.js";
import type { Database } from "../db/client.js";

export function createAuthRouter(db: Database) {
  const router = Router();

  router.post("/signup", async (req, res) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const result = await signup(db, { email, password });

    if ("error" in result) {
      const status = result.error.includes("already exists") ? 409 : 400;
      res.status(status).json({ error: result.error });
      return;
    }

    res.status(201).json(result.tokens);
  });

  router.post("/login", async (req, res) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const result = await login(db, { email, password });

    if ("error" in result) {
      res.status(401).json({ error: result.error });
      return;
    }

    res.json(result.tokens);
  });

  router.post("/refresh", async (req, res) => {
    const { refreshToken } = req.body ?? {};

    if (!refreshToken) {
      res.status(400).json({ error: "Refresh token is required" });
      return;
    }

    const result = await refreshSession(db, refreshToken);

    if ("error" in result) {
      res.status(401).json({ error: result.error });
      return;
    }

    res.json(result.tokens);
  });

  router.post("/logout", async (req, res) => {
    const { sessionId } = req.body ?? {};

    if (sessionId && typeof sessionId === "string") {
      await logout(db, sessionId);
    }

    res.status(204).send();
  });

  return router;
}
