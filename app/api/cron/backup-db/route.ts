export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/jobs/cron-auth";
import { runDatabaseBackup } from "@/lib/jobs/backup";
import { pingHeartbeat } from "@/lib/jobs/heartbeat";

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runDatabaseBackup();
  await pingHeartbeat("backup-db");
  return NextResponse.json(result);
}
