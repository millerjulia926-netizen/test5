import pg from "pg";

export function getTestDatabaseUrl(): string {
  return process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
}

export async function isDatabaseAvailable(connectionString: string): Promise<boolean> {
  if (!connectionString) {
    return false;
  }

  const pool = new pg.Pool({ connectionString });

  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await pool.end();
  }
}

export async function resetDatabase(connectionString: string): Promise<void> {
  const pool = new pg.Pool({ connectionString });

  try {
    await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
    await pool.query("CREATE SCHEMA public");
    await pool.query("GRANT ALL ON SCHEMA public TO public");
  } finally {
    await pool.end();
  }
}
