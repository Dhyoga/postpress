export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { TEMPLATE_META } from "@/lib/render/registry";

/**
 * Template layout hardcoded di kode (agents.md §B.3), bukan baris database — endpoint ini
 * cuma mengekspos satu sumber kebenaran yang sudah ada di lib/render/registry.ts (dipakai
 * juga oleh render.ts dan validator copywriter) supaya UI tidak menyalin ulang id/batas
 * karakter template di file terpisah yang gampang basi.
 */
export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const templates = TEMPLATE_META.map((meta) => ({
    id: meta.id,
    name: meta.name,
    slots: Object.fromEntries(Object.entries(meta.slots).map(([slot, { max }]) => [slot, max])),
  }));

  return NextResponse.json({ templates });
}
