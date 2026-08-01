export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getOrCreateDefaultAccount, getPersonaByAccount, listSegments, replaceSegments } from "@/lib/db/queries";

// Skema yang sama dipakai untuk item dari form manual maupun hasil parse Excel
// di client (agents.md aturan #6) — keduanya mengirim ke endpoint ini.
const SegmentItemSchema = z.object({
  name: z.string().trim().min(1, "Nama segmen wajib diisi").max(200),
  tier: z.string().trim().max(50).nullish(),
  description: z.string().trim().max(2000).nullish(),
  painPoint: z.string().trim().max(2000).nullish(),
  need: z.string().trim().max(2000).nullish(),
});

const SegmentsPayloadSchema = z.object({
  personaId: z.string().uuid(),
  items: z.array(SegmentItemSchema),
});

export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }
  let personaId = new URL(req.url).searchParams.get("personaId") || "";
  if (!personaId) {
    // Klien (PersonaProvider) belum tahu personaId sebelum GET /api/persona
    // selesai — jatuhkan ke persona akun default (v1 satu akun) yang sama.
    const account = await getOrCreateDefaultAccount();
    const persona = await getPersonaByAccount(account.id);
    if (!persona) return NextResponse.json({ segments: [] });
    personaId = persona.id;
  }
  const rows = await listSegments(personaId);
  return NextResponse.json({ segments: rows });
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = SegmentsPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data segmentasi tidak valid", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { personaId, items } = parsed.data;
  const safe = items.map((it) => ({
    personaId,
    name: it.name,
    tier: it.tier ?? null,
    description: it.description ?? null,
    painPoint: it.painPoint ?? null,
    need: it.need ?? null,
  }));
  const rows = await replaceSegments(personaId, safe);
  return NextResponse.json({ segments: rows }, { status: 201 });
}
