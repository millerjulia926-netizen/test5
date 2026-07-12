import express, { type Express, type NextFunction, type Request, type Response } from "express";

import { createApiRouter } from "./api/router.js";
import type { Database } from "./db/client.js";

export interface AppDependencies {
  db: Database;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();

  app.use(express.json());
  app.use(createApiRouter(deps));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
