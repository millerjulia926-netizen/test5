import { Router } from "express";

import type { AppDependencies } from "../app.js";
import { createHealthRouter } from "./health.js";

export function createApiRouter(_deps: AppDependencies): Router {
  const router = Router();

  router.use(createHealthRouter());

  return router;
}
