export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSettingsSnapshot } from "@/lib/db/queries";

export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }
  const snapshot = await getSettingsSnapshot();
  return NextResponse.json(snapshot);
}

export async function PATCH(_req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }
  // Jadwal cron & channel notifikasi dikonfigurasi lewat environment variable
  // (lihat .env.example), bukan disimpan di DB — belum ada state yang bisa
  // di-PATCH dari endpoint ini di v1.
  return NextResponse.json({ error: "Pengaturan ini belum bisa diubah lewat API" }, { status: 501 });
}
