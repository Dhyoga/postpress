export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getActiveLlmSettings, upsertLlmSettings } from "@/lib/db/queries";
import { encryptToken } from "@/lib/instagram/token-crypto";
import { LLM_PROVIDERS } from "@/lib/llm/providers";

/** Fallback env — dipakai HANYA untuk menampilkan status di UI kalau belum
 * ada baris di database (openspec/changes/dynamic-llm-settings-in-db). Kalau
 * tersimpan, API key mentah TIDAK PERNAH keluar lewat response ini, cuma
 * `hasApiKey: true/false`. */
function envFallbackView() {
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN;
  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey || !baseUrl || !model) return null;
  return { provider: "claude" as const, baseUrl, model, hasApiKey: true, source: "env" as const, updatedAt: null };
}

export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const row = await getActiveLlmSettings();
  if (row) {
    return NextResponse.json({
      provider: row.provider,
      baseUrl: row.baseUrl,
      model: row.model,
      hasApiKey: Boolean(row.apiKeyEncrypted),
      source: "database" as const,
      updatedAt: row.updatedAt,
    });
  }

  return NextResponse.json(
    envFallbackView() ?? { provider: "claude", baseUrl: "", model: "", hasApiKey: false, source: "none" as const, updatedAt: null },
  );
}

const LlmSettingsSchema = z.object({
  provider: z.enum(LLM_PROVIDERS as [string, ...string[]], { message: "Provider tidak dikenal" }),
  baseUrl: z.string().trim().min(1, "Base URL wajib diisi").url("Base URL tidak valid, mis. https://api.mistral.ai"),
  model: z.string().trim().min(1, "Nama model wajib diisi").max(200, "Nama model terlalu panjang"),
  // Kosong = pertahankan API key lama (form password tidak pernah menampilkan nilai tersimpan).
  apiKey: z.string().trim().max(2000).optional(),
});

export async function PUT(req: NextRequest) {
  let userId: string;
  try {
    userId = (await requireUser()).id;
  } catch {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login lagi" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = LlmSettingsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data pengaturan LLM tidak valid", issues: parsed.error.issues }, { status: 400 });
  }

  const { provider, baseUrl, model, apiKey } = parsed.data;
  const existing = await getActiveLlmSettings();
  if (!existing && !apiKey) {
    return NextResponse.json({ error: "API key wajib diisi untuk konfigurasi LLM baru" }, { status: 400 });
  }

  const row = await upsertLlmSettings({
    provider,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    model,
    apiKeyEncrypted: apiKey ? encryptToken(apiKey) : undefined,
    updatedBy: userId,
  });

  return NextResponse.json({
    provider: row.provider,
    baseUrl: row.baseUrl,
    model: row.model,
    hasApiKey: Boolean(row.apiKeyEncrypted),
    source: "database" as const,
    updatedAt: row.updatedAt,
  });
}
