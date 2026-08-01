export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getOrCreateDefaultAccount, getPersonaByAccount, upsertPersona } from "@/lib/db/queries";

// Sama dengan bentuk kolom tabel `personas` (lib/db/schema.ts) — dipakai untuk
// validasi form manual maupun payload hasil parse Excel (agents.md aturan #6),
// karena keduanya wajib lewat endpoint yang sama ini.
const PersonaPayloadSchema = z.object({
  brandName: z.string().trim().max(200).optional(),
  tagline: z.string().trim().max(300).optional(),
  positioning: z.string().trim().max(1000).optional(),
  dos: z.string().trim().max(1000).optional(),
  donts: z.string().trim().max(1000).optional(),
  contentMix: z.record(z.string(), z.number().min(0).max(100)).optional(),
  postFrequency: z.number().int().min(0).max(50).optional(),
  voicePillars: z.array(z.string().trim().min(1)).optional(),
  voicePairs: z.array(z.object({ do: z.string(), dont: z.string() })).optional(),
  coreValues: z.string().trim().max(1000).optional(),
  sapaan: z.enum(["kamu", "anda", "campur"]).optional(),
  istilahAsing: z.enum(["pertahankan", "indonesia", "campur"]).optional(),
  formatTanggalContoh: z.string().trim().max(100).optional(),
  formatAngkaContoh: z.string().trim().max(100).optional(),
  gayaJudul: z.enum(["sentence", "title"]).optional(),
  colors: z.record(z.string(), z.string()).optional(),
  fonts: z.record(z.string(), z.string()).optional(),
  visualLarangan: z.string().trim().max(1000).optional(),
});

export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }
  const account = await getOrCreateDefaultAccount();
  const persona = await getPersonaByAccount(account.id);
  return NextResponse.json({ persona });
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = PersonaPayloadSchema.safeParse(json?.data ?? json ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data persona tidak valid", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const account = await getOrCreateDefaultAccount();
  const rows = await upsertPersona({ accountId: account.id, data: { ...parsed.data, updatedBy: user.id } });
  return NextResponse.json({ persona: rows[0] }, { status: 201 });
}
