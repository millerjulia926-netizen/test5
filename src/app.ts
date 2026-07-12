import path from "node:path";
import { fileURLToPath } from "node:url";

import express, { type Express, type NextFunction, type Request, type Response } from "express";

import { createApiRouter } from "./api/router.js";
import type { Database } from "./db/client.js";

export interface AppDependencies {
  db: Database;
}

export interface AppOptions {
  clientDistPath?: string;
}

export function createApp(deps: AppDependencies, options: AppOptions = {}): Express {
  const app = express();

  app.use(express.json());
  app.use(createApiRouter(deps));

  if (options.clientDistPath) {
    app.use(express.static(options.clientDistPath, { index: false }));

    app.get(/^(?!\/(auth|notes|health|me)(\/|$)).*/, (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET") {
        next();
        return;
      }

      res.sendFile(path.join(options.clientDistPath!, "index.html"), (error) => {
        if (error) {
          next(error);
        }
      });
    });
  }

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

export function resolveClientDistPath(): string | undefined {
  const distPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../client/dist");
  return distPath;
}
