import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createDbPool } from "./client.js";
import * as schema from "./schema.js";

const migrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), "../migrations");

export async function runMigrations(connectionString?: string) {
  const pool = createDbPool(connectionString);
  const db = drizzle(pool, { schema });

  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await pool.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runMigrations().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
