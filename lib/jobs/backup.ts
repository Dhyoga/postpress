import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/lib/db/index";
import * as schema from "@/lib/db/schema";
import { uploadObject } from "@/lib/storage/r2";
import { notifyJobFailure } from "./notify";

const BACKUP_TABLES: Record<string, PgTable> = {
  users: schema.users,
  sessions: schema.sessions,
  igAccounts: schema.igAccounts,
  contentPlans: schema.contentPlans,
  posts: schema.posts,
  slides: schema.slides,
  publishLogs: schema.publishLogs,
  personas: schema.personas,
  personaSegments: schema.personaSegments,
  personaKeywords: schema.personaKeywords,
};

export type BackupResult = { key: string; tables: number; rows: number } | { error: string };

/**
 * `backup:database` (Fase 6) — dump tiap tabel ke JSON dan upload ke R2.
 * Bukan `pg_dump` karena target deploy (Vercel-style serverless) umumnya
 * tidak punya akses shell ke binary `pg_dump` di host yang menjalankan cron;
 * dump level-aplikasi lewat Drizzle jalan di runtime Node yang sama dengan
 * app-nya sendiri. `ig_accounts.token_encrypted` ikut ter-dump apa adanya
 * (masih terenkripsi, bukan plaintext) — lihat lib/instagram/token-crypto.ts.
 */
export async function runDatabaseBackup(): Promise<BackupResult> {
  try {
    const dump: Record<string, unknown[]> = {};
    let totalRows = 0;
    for (const [name, table] of Object.entries(BACKUP_TABLES)) {
      const rows = await db.select().from(table as never);
      dump[name] = rows;
      totalRows += rows.length;
    }

    const date = new Date().toISOString().slice(0, 10);
    const key = `backups/${date}/postpress-${Date.now()}.json`;
    await uploadObject(key, Buffer.from(JSON.stringify(dump), "utf8"), "application/json");

    return { key, tables: Object.keys(BACKUP_TABLES).length, rows: totalRows };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backup database gagal";
    await notifyJobFailure("backup:database", message);
    return { error: message };
  }
}
