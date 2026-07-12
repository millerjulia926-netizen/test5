import path from "node:path";

import { createApp, resolveClientDistPath } from "./app.js";
import { env } from "./config/env.js";
import { createDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";

async function main() {
  if (env.nodeEnv === "production") {
    await runMigrations(env.databaseUrl);
  }

  const db = createDb();
  const clientDistPath = env.nodeEnv === "production" ? resolveClientDistPath() : undefined;
  const app = createApp({ db }, { clientDistPath });

  app.listen(env.port, () => {
    console.log(`test1 API listening on port ${env.port}`);
    if (clientDistPath) {
      console.log(`Serving client assets from ${path.relative(process.cwd(), clientDistPath)}`);
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
