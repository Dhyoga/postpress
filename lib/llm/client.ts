import { z } from "zod";
import { getLlmConfig } from "./settings";
import { buildLlmRequest, extractToolInput } from "./providers";
import { LlmError } from "./errors";

export { LlmError };

interface StructuredCallParams<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  toolName: string;
  toolDescription: string;
  /** 0.3-0.5 — Bagian B agents.md: "Ini bukan tugas kreatif bebas." */
  temperature?: number;
}

/**
 * Satu-satunya titik keluar ke LLM eksternal. Memaksa output terstruktur lewat
 * tool-use (`tool_choice` dipatok ke satu tool) alih-alih berharap model
 * "balas JSON saja" (agents.md §B aturan wajib #1). Skema Zod dikonversi ke
 * JSON Schema lewat `z.toJSONSchema` (Zod v4 native, tanpa dependensi baru)
 * dan hasilnya divalidasi ulang dengan skema Zod yang sama sebelum dipakai —
 * tool-use hanya membatasi *bentuk*, bukan aturan seperti batas karakter yang
 * tetap harus dicek eksplisit oleh pemanggil.
 *
 * Konfigurasi (provider/base URL/API key/model) dibaca dari database lewat
 * getLlmConfig() (openspec/changes/dynamic-llm-settings-in-db) — bukan
 * process.env langsung — supaya bisa diganti dari Pengaturan tanpa redeploy.
 */
export async function callStructured<T>(params: StructuredCallParams<T>): Promise<T> {
  const config = await getLlmConfig();

  const jsonSchema = z.toJSONSchema(params.schema, { target: "draft-7" }) as Record<string, unknown>;
  delete jsonSchema.$schema;

  const { url, init } = buildLlmRequest(config.provider, {
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    model: config.model,
    system: params.system,
    user: params.user,
    toolName: params.toolName,
    toolDescription: params.toolDescription,
    jsonSchema,
    temperature: params.temperature ?? 0.4,
  });

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new LlmError("Tidak bisa menghubungi layanan LLM. Coba lagi sebentar lagi.");
  }

  if (!res.ok) {
    throw new LlmError(`Layanan LLM merespons dengan error (HTTP ${res.status}).`);
  }

  const body = await res.json();
  const toolInput = extractToolInput(config.provider, body, params.toolName);

  const parsed = params.schema.safeParse(toolInput);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new LlmError(`Output LLM tidak sesuai skema (${issues}).`);
  }
  return parsed.data;
}
