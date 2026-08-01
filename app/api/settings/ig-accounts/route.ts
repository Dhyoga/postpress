export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listAllAccounts } from "@/lib/db/queries";
import { toIgAccountView } from "@/lib/instagram/view";

export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const rows = await listAllAccounts();
  return NextResponse.json({ accounts: rows.map(toIgAccountView) });
}
