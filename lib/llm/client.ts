import { z } from "zod";

const ANTHROPIC_VERSION = "2023-06-01";

/** Error yang sampai ke pemanggil sudah berupa kalimat yang bisa ditindaklanjuti
 * (agents.md: "Error yang sampai ke UI harus kalimat yang bisa ditindaklanjuti
 * pengguna, bukan pesan teknis") — jangan pernah sertakan body respons mentah
 * atau header di sini, supaya token tidak ikut bocor ke log/pesan error. */
export class LlmError extends Error {}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new LlmError(`${name} belum diset di environment`);
  return value;
}

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
 */
export async function callStructured<T>(params: StructuredCallParams<T>): Promise<T> {
  const baseUrl = requireEnv("ANTHROPIC_BASE_URL").replace(/\/+$/, "");
  const token = requireEnv("ANTHROPIC_AUTH_TOKEN");
  const model = requireEnv("ANTHROPIC_MODEL");

  const jsonSchema = z.toJSONSchema(params.schema, { target: "draft-7" }) as Record<string, unknown>;
  delete jsonSchema.$schema;

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "anthropic-version": ANTHROPIC_VERSION,
        "x-api-key": token,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: params.temperature ?? 0.4,
        system: params.system,
        messages: [{ role: "user", content: params.user }],
        tools: [{ name: params.toolName, description: params.toolDescription, input_schema: jsonSchema }],
        tool_choice: { type: "tool", name: params.toolName },
      }),
    });
  } catch {
    throw new LlmError("Tidak bisa menghubungi layanan LLM. Coba lagi sebentar lagi.");
  }

  if (!res.ok) {
    throw new LlmError(`Layanan LLM merespons dengan error (HTTP ${res.status}).`);
  }

  const body = (await res.json()) as { content?: Array<{ type: string; name?: string; input?: unknown }> };
  const toolUse = body.content?.find((block) => block.type === "tool_use" && block.name === params.toolName);
  if (!toolUse) {
    throw new LlmError("LLM tidak mengembalikan output terstruktur yang diharapkan.");
  }

  const parsed = params.schema.safeParse(toolUse.input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new LlmError(`Output LLM tidak sesuai skema (${issues}).`);
  }
  return parsed.data;
}
