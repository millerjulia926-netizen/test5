import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { env } from "../config/env.js";
import * as schema from "./schema.js";

export function createDbPool(connectionString = env.databaseUrl) {
  return new pg.Pool({ connectionString });
}

export function createDb(connectionString = env.databaseUrl) {
  const pool = createDbPool(connectionString);
  return drizzle(pool, { schema });
}

export type Database = ReturnType<typeof createDb>;
