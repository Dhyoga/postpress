export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/jobs/cron-auth";
import { runPlanWeekly } from "@/lib/jobs/plan-weekly";
import { pingHeartbeat } from "@/lib/jobs/heartbeat";

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const results = await runPlanWeekly();
  await pingHeartbeat("plan-weekly");
  return NextResponse.json({ results });
}
