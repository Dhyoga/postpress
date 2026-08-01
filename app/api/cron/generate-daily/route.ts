export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/jobs/cron-auth";
import { runGenerateDaily } from "@/lib/jobs/generate-daily";
import { pingHeartbeat } from "@/lib/jobs/heartbeat";

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const results = await runGenerateDaily();
  await pingHeartbeat("generate-daily");
  return NextResponse.json({ results });
}
