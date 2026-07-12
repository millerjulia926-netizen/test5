import { Router } from "express";

import type { AppDependencies } from "../app.js";
import { createAuthRouter } from "./auth.js";
import { createHealthRouter } from "./health.js";
import { createNotesRouter } from "./notes.js";

export function createApiRouter(deps: AppDependencies): Router {
  const router = Router();

  router.use(createHealthRouter(deps));
  router.use("/auth", createAuthRouter(deps.db));
  router.use("/notes", createNotesRouter(deps.db));

  return router;
}
