import type { Database } from "../db/client.js";

export interface ServiceContext {
  db: Database;
}

export function createServiceContext(db: Database): ServiceContext {
  return { db };
}
