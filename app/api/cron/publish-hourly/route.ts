export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/jobs/cron-auth";
import { runPublishHourly } from "@/lib/jobs/publish-hourly";
import { pingHeartbeat } from "@/lib/jobs/heartbeat";

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const results = await runPublishHourly();
  await pingHeartbeat("publish-hourly");
  return NextResponse.json({ results });
}
