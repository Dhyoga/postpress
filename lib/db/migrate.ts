import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const run = async () => {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(sql, { schema });
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
  await sql.end();
  console.log("migrations applied");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
