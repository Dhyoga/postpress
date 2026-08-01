import { GraphApiError } from "./errors";

const DEFAULT_API_VERSION = "v26.0";

export interface AppUsage {
  callCount?: number;
  totalCputime?: number;
  totalTime?: number;
}

export interface GraphResult<T> {
  data: T;
  appUsage: AppUsage | null;
}

interface GraphClientOptions {
  /** Dipakai `publish:dry-run` (Fase 4) dan test — mengganti `fetch` global
   * dengan stub supaya tidak pernah memanggil Meta sungguhan. */
  fetchImpl?: typeof fetch;
  apiVersion?: string;
}

function parseAppUsage(headers: Headers): AppUsage | null {
  const raw = headers.get("x-app-usage");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { call_count?: number; total_cputime?: number; total_time?: number };
    return { callCount: parsed.call_count, totalCputime: parsed.total_cputime, totalTime: parsed.total_time };
  } catch {
    return null;
  }
}

/** Klien Graph API tipis dengan penanganan error terstruktur (agents.md Fase 4).
 * Setiap panggilan mengembalikan header `X-App-Usage` yang di-parse supaya
 * pemanggil (lib/instagram/publish.ts) bisa mencatatnya ke `publish_logs`
 * (design.md §8.4: "Rate limit umum ... dicatat ke publish_logs"). */
export class GraphClient {
  private readonly fetchImpl: typeof fetch;
  private readonly apiVersion: string;

  constructor(private readonly accessToken: string, options: GraphClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.apiVersion = options.apiVersion ?? process.env.META_API_VERSION ?? DEFAULT_API_VERSION;
  }

  private async request<T>(path: string, params: Record<string, string>, method: "GET" | "POST" = "POST"): Promise<GraphResult<T>> {
    const url = new URL(`https://graph.facebook.com/${this.apiVersion}/${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    url.searchParams.set("access_token", this.accessToken);

    let res: Response;
    try {
      res = await this.fetchImpl(url.toString(), { method });
    } catch {
      throw new GraphApiError("Tidak bisa menghubungi Instagram Graph API. Coba lagi sebentar lagi.");
    }

    const appUsage = parseAppUsage(res.headers);
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: number; error_subcode?: number; fbtrace_id?: string } } & T;

    if (!res.ok || body.error) {
      throw new GraphApiError(body.error?.message ?? `Graph API merespons dengan error (HTTP ${res.status})`, {
        code: body.error?.code,
        subcode: body.error?.error_subcode,
        fbtraceId: body.error?.fbtrace_id,
      });
    }

    return { data: body, appUsage };
  }

  /** design.md §8.2 — POST /{ig-user-id}/media (single post, bukan carousel item). */
  async createMediaContainer(igUserId: string, imageUrl: string, caption?: string): Promise<GraphResult<{ id: string }>> {
    const params: Record<string, string> = { image_url: imageUrl };
    if (caption) params.caption = caption;
    return this.request<{ id: string }>(`${igUserId}/media`, params);
  }

  /** design.md §8.3 langkah 1 — satu container per slide carousel. */
  async createCarouselItem(igUserId: string, imageUrl: string): Promise<GraphResult<{ id: string }>> {
    return this.request<{ id: string }>(`${igUserId}/media`, { image_url: imageUrl, is_carousel_item: "true" });
  }

  /** design.md §8.3 langkah 2 — container induk yang menggabungkan children. */
  async createCarouselContainer(igUserId: string, childrenIds: string[], caption?: string): Promise<GraphResult<{ id: string }>> {
    const params: Record<string, string> = { media_type: "CAROUSEL", children: childrenIds.join(",") };
    if (caption) params.caption = caption;
    return this.request<{ id: string }>(`${igUserId}/media`, params);
  }

  /** design.md §8.2/§8.3 langkah terakhir — publish container (single atau carousel). */
  async publishMedia(igUserId: string, creationId: string): Promise<GraphResult<{ id: string }>> {
    return this.request<{ id: string }>(`${igUserId}/media_publish`, { creation_id: creationId });
  }

  /** design.md §8.4 — cek kuota harian sebelum publish, bukan percaya angka dari blog. */
  async getContentPublishingLimit(
    igUserId: string,
  ): Promise<
    GraphResult<{ data: Array<{ quota_usage: number; config?: { quota_total: number; quota_duration: number } }> }>
  > {
    return this.request(`${igUserId}/content_publishing_limit`, {}, "GET");
  }
}
