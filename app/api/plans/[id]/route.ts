export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getContentPlan, updateContentPlanThemes, deleteContentPlan } from "@/lib/db/queries";
import { ThemeSchema } from "@/lib/llm/schemas/plan";

const UpdateThemesSchema = z.object({
  themes: z.array(ThemeSchema),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = UpdateThemesSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tema tidak valid", issues: parsed.error.issues }, { status: 400 });
  }

  const existing = await getContentPlan(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [plan] = await updateContentPlanThemes(id, parsed.data.themes);
  return NextResponse.json({ plan });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getContentPlan(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteContentPlan(id);
  return NextResponse.json({ ok: true });
}
