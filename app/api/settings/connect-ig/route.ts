export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createIgAccount, updateIgAccount, getIgAccount, getIgAccountByHandle } from "@/lib/db/queries";
import { encryptToken } from "@/lib/instagram/token-crypto";
import { toIgAccountView } from "@/lib/instagram/view";

// design.md §8.5: System User token (rekomendasi) tidak kedaluwarsa —
// `neverExpires: true` (default) menyimpan tokenExpiresAt = null, sama
// seperti yang dibaca lib/instagram/token-refresh.ts sebagai "tidak disentuh".
// Long-lived user token berlaku 60 hari, jadi `expiresInDays` dibatasi ke situ.
const ConnectIgSchema = z.object({
  accountId: z.string().uuid().optional(),
  handle: z
    .string()
    .trim()
    .min(1, "Handle Instagram wajib diisi")
    .max(60, "Handle terlalu panjang")
    .transform((v) => v.replace(/^@+/, "")),
  igUserId: z.string().trim().min(1, "IG User ID wajib diisi").max(100, "IG User ID terlalu panjang"),
  accessToken: z.string().trim().min(10, "Token akses tidak valid"),
  neverExpires: z.boolean().optional().default(true),
  expiresInDays: z.number().int().positive().max(60).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = ConnectIgSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data akun Instagram tidak valid", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { accountId, handle, igUserId, accessToken, neverExpires, expiresInDays } = parsed.data;
  const tokenExpiresAt = neverExpires ? null : new Date(Date.now() + (expiresInDays ?? 60) * 24 * 60 * 60 * 1000);

  const payload = {
    handle,
    igUserId,
    tokenEncrypted: encryptToken(accessToken),
    tokenExpiresAt,
    isActive: true,
  };

  const existing = accountId ? await getIgAccount(accountId) : await getIgAccountByHandle(handle);
  if (accountId && !existing) {
    return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
  }

  const [row] = existing ? await updateIgAccount(existing.id, payload) : await createIgAccount(payload);
  return NextResponse.json({ account: toIgAccountView(row) }, { status: existing ? 200 : 201 });
}

const DisconnectIgSchema = z.object({ accountId: z.string().uuid("ID akun tidak valid") });

/** Putuskan koneksi: token dihapus dari database (bukan cuma ditandai), akun
 * jadi tidak aktif. lib/instagram/token-refresh.ts dan publish flow melewati
 * akun `isActive: false`, jadi publikasi otomatis berhenti sampai
 * disambungkan ulang lewat POST di atas. */
export async function DELETE(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = DisconnectIgSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "ID akun tidak valid" }, { status: 400 });
  }

  const existing = await getIgAccount(parsed.data.accountId);
  if (!existing) {
    return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
  }

  const [row] = await updateIgAccount(existing.id, {
    isActive: false,
    tokenEncrypted: "",
    tokenExpiresAt: null,
  });
  return NextResponse.json({ account: toIgAccountView(row) });
}
