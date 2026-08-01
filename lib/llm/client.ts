import { z } from "zod";
import { getLlmConfig } from "./settings";
import { buildLlmRequest, extractToolInput } from "./providers";
import { LlmError } from "./errors";

export { LlmError };

const MAX_ERROR_DETAIL_LENGTH = 300;

/** Ambil pesan error yang aman ditampilkan dari body respons provider (Claude,
 * Mistral, Gemini pakai nama field beda-beda — coba yang umum lalu fallback ke
 * raw text) untuk modal Riwayat. Sengaja tidak menyertakan header atau field
 * lain di luar pesan teks, dan dibatasi panjangnya. */
function extractErrorDetail(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const body = JSON.parse(trimmed) as { message?: unknown; detail?: unknown; error?: unknown };
    const nestedMessage =
      typeof body.error === "object" && body.error !== null
        ? (body.error as { message?: unknown }).message
        : undefined;
    const candidate =
      (typeof body.message === "string" && body.message) ||
      (typeof nestedMessage === "string" && nestedMessage) ||
      (typeof body.error === "string" && body.error) ||
      (typeof body.detail === "string" && body.detail) ||
      null;
    if (candidate) return candidate.trim().slice(0, MAX_ERROR_DETAIL_LENGTH);
  } catch {
    // Bukan JSON — pakai raw text di bawah.
  }

  return trimmed.replace(/\s+/g, " ").slice(0, MAX_ERROR_DETAIL_LENGTH);
}

type PathSegment = PropertyKey;
type Issue = z.ZodError["issues"][number];

function getAtPath(obj: unknown, path: readonly PathSegment[]): unknown {
  let cur = obj;
  for (const seg of path) {
    if (cur == null) return undefined;
    cur = (cur as Record<PathSegment, unknown>)[seg];
  }
  return cur;
}

function setAtPath(obj: unknown, path: readonly PathSegment[], value: unknown): void {
  let cur = obj as Record<PathSegment, unknown>;
  for (let i = 0; i < path.length - 1; i += 1) {
    cur = cur[path[i]] as Record<PathSegment, unknown>;
  }
  cur[path[path.length - 1]] = value;
}

/** Potong di spasi terakhir yang masih dalam batas, supaya tidak memutus kata
 * di tengah — kalau tidak ada spasi yang masuk akal, potong keras saja. */
function truncateAtWordBoundary(str: string, max: number): string {
  const cut = str.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > max * 0.6) return cut.slice(0, lastSpace).trimEnd();
  return cut.trimEnd();
}

/** Model function-calling (terutama provider selain Claude) sering tidak
 * patuh batas `maxLength` di JSON Schema meski sudah diberi tahu di prompt.
 * Kalau SEMUA pelanggaran skema cuma soal teks kepanjangan (bukan struktur
 * atau tipe salah), potong otomatis di batas kata terdekat alih-alih
 * menggagalkan seluruh generate — lebih baik teks sedikit terpotong daripada
 * pengguna harus generate ulang dari nol untuk hal yang bisa diperbaiki
 * secara mekanis. */
function tryAutoTruncate(input: unknown, issues: readonly Issue[]): unknown | null {
  if (issues.length === 0) return null;
  const allTooLongStrings = issues.every((i) => i.code === "too_big" && i.origin === "string");
  if (!allTooLongStrings) return null;

  const healed = structuredClone(input);
  for (const issue of issues) {
    const value = getAtPath(healed, issue.path);
    if (typeof value !== "string") return null;
    setAtPath(healed, issue.path, truncateAtWordBoundary(value, (issue as { maximum: number }).maximum));
  }
  return healed;
}

function describeIssue(issue: Issue, input: unknown): string {
  const path = issue.path.join(".");
  if (issue.code === "too_big" && issue.origin === "string") {
    const value = getAtPath(input, issue.path);
    const actual = typeof value === "string" ? value.length : undefined;
    const detail = actual !== undefined ? ` (${actual}/${issue.maximum} karakter)` : "";
    return `${path}: ${issue.message}${detail}`;
  }
  return `${path}: ${issue.message}`;
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
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new LlmError("Layanan LLM tidak merespons dalam 60 detik. Coba lagi.");
    }
    throw new LlmError("Tidak bisa menghubungi layanan LLM. Coba lagi sebentar lagi.");
  }

  if (!res.ok) {
    const rawBody = await res.text().catch(() => "");
    const detail = extractErrorDetail(rawBody);
    const summary = `Layanan LLM merespons dengan error (HTTP ${res.status}).`;
    throw new LlmError(detail ? `${summary}\n${detail}` : summary);
  }

  const body = await res.json();
  const toolInput = extractToolInput(config.provider, body, params.toolName);

  const parsed = params.schema.safeParse(toolInput);
  if (parsed.success) return parsed.data;

  const healedInput = tryAutoTruncate(toolInput, parsed.error.issues);
  if (healedInput !== null) {
    const healedParsed = params.schema.safeParse(healedInput);
    if (healedParsed.success) return healedParsed.data;
  }

  const issues = parsed.error.issues.map((i) => describeIssue(i, toolInput)).join("; ");
  throw new LlmError(`Output LLM tidak sesuai skema (${issues}).`);
}
