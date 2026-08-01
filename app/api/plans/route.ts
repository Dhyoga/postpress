export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { listContentPlans, createContentPlan, getOrCreateDefaultAccount } from "@/lib/db/queries";
import { ThemeSchema } from "@/lib/llm/schemas/plan";

const CreatePlanSchema = z.object({
  accountId: z.string().uuid().optional(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  themes: z.array(ThemeSchema),
});

export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const url = new URL(req.url);
  let accountId = url.searchParams.get("accountId") || "";
  if (!accountId) {
    const account = await getOrCreateDefaultAccount();
    accountId = account.id;
  }
  const rows = await listContentPlans(accountId);
  return NextResponse.json({ plans: rows });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = CreatePlanSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data rencana tidak valid", issues: parsed.error.issues }, { status: 400 });
  }

  const account = parsed.data.accountId ? { id: parsed.data.accountId } : await getOrCreateDefaultAccount();
  const [plan] = await createContentPlan({
    accountId: account.id,
    periodStart: new Date(parsed.data.periodStart),
    periodEnd: new Date(parsed.data.periodEnd),
    themes: parsed.data.themes,
    createdBy: user.id,
  });
  return NextResponse.json({ plan }, { status: 201 });
}
