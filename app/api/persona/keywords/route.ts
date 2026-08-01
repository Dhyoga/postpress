export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getOrCreateDefaultAccount, getPersonaByAccount, listKeywords, replaceKeywords } from "@/lib/db/queries";

// Skema yang sama dipakai untuk item dari form manual maupun hasil parse Excel
// di client (agents.md aturan #6) — keduanya mengirim ke endpoint ini.
const KeywordItemSchema = z.object({
  category: z.enum(["topik", "hashtag", "larangan", "cta"]),
  value: z.string().trim().min(1).max(200),
});

const KeywordsPayloadSchema = z.object({
  personaId: z.string().uuid(),
  items: z.array(KeywordItemSchema),
});

export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }
  let personaId = new URL(req.url).searchParams.get("personaId") || "";
  if (!personaId) {
    // Sama seperti /api/persona/segments — jatuhkan ke persona akun default
    // saat klien belum tahu personaId eksplisit.
    const account = await getOrCreateDefaultAccount();
    const persona = await getPersonaByAccount(account.id);
    if (!persona) return NextResponse.json({ keywords: [] });
    personaId = persona.id;
  }
  const rows = await listKeywords(personaId);
  return NextResponse.json({ keywords: rows });
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = KeywordsPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data kata kunci tidak valid", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { personaId, items } = parsed.data;
  // De-duplikasi (personaId, category, value) sesuai unique constraint di skema.
  const seen = new Set<string>();
  const safe = items.filter((it) => {
    const key = `${it.category}::${it.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const rows = await replaceKeywords(personaId, safe.map((it) => ({ personaId, category: it.category, value: it.value })));
  return NextResponse.json({ keywords: rows }, { status: 201 });
}
