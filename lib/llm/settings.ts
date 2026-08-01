import { getActiveLlmSettings } from "@/lib/db/queries";
import { decryptToken } from "@/lib/instagram/token-crypto";
import { LlmError } from "./errors";
import { DEFAULT_BASE_URLS, isLlmProvider, type LlmProvider } from "./providers";

export interface LlmConfig {
  provider: LlmProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
}

function fromEnv(): LlmConfig | null {
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN;
  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey || !baseUrl || !model) return null;
  return { provider: "claude", baseUrl: baseUrl.replace(/\/+$/, ""), apiKey, model };
}

/** Baca konfigurasi LLM aktif dari database, fallback ke `.env`
 * (openspec/changes/dynamic-llm-settings-in-db/design.md keputusan #3) kalau
 * baris DB belum diisi ATAU tabelnya belum ada (mis. migration belum jalan
 * di environment ini) — supaya rollout tidak downtime. */
export async function getLlmConfig(): Promise<LlmConfig> {
  const row = await getActiveLlmSettings().catch(() => null);
  if (row?.apiKeyEncrypted) {
    return {
      provider: isLlmProvider(row.provider) ? row.provider : "claude",
      baseUrl: row.baseUrl.replace(/\/+$/, "") || DEFAULT_BASE_URLS.claude,
      apiKey: decryptToken(row.apiKeyEncrypted),
      model: row.model,
    };
  }

  const envConfig = fromEnv();
  if (envConfig) return envConfig;

  throw new LlmError("Konfigurasi LLM belum diatur. Isi lewat halaman Pengaturan atau .env.");
}
