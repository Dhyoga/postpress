import type { PostStatus, PostType } from "@/lib/types";
import type { PostEventEntry } from "@/lib/mock/types";
import { wibDateString, wibTimeString } from "@/lib/format";

type SlideRow = { position: number; kind: string };
type PostEventRow = { message: string; ok: boolean; createdAt: Date | string };

type PostRow = {
  id: string;
  type: string;
  template: string;
  topic: string;
  caption: string | null;
  hashtags: string[] | null;
  status: string;
  scheduledFor: Date | string | null;
  errorMessage: string | null;
  slides?: SlideRow[];
  postEvents?: PostEventRow[];
};

/**
 * Bentuk yang dipakai UI (Queue/History/Today, lihat lib/mock/types.ts#Post) berbeda dari
 * kolom tabel `posts` sungguhan (scheduledFor vs date/time, hashtags vs tags, slides vs
 * slideKinds) — dipetakan di satu tempat ini supaya GET /api/posts dan GET /api/posts/[id]
 * tidak masing-masing menyalin ulang logikanya dan berisiko beda hasil.
 */
export function toPostView(row: PostRow) {
  const scheduled = row.scheduledFor ? new Date(row.scheduledFor) : null;
  const slideKinds = (row.slides ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => s.kind);
  // Urut lama -> baru (narasi lifecycle post) — jangan andalkan orderBy di
  // query relasi, urutkan eksplisit di sini biar tidak tergantung perilaku
  // drizzle relational query.
  const logs: PostEventEntry[] = (row.postEvents ?? [])
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((event) => ({
      message: event.message,
      ok: event.ok,
      time: wibTimeString(new Date(event.createdAt)),
    }));

  return {
    id: row.id,
    date: scheduled ? wibDateString(scheduled) : "",
    time: scheduled ? wibTimeString(scheduled) : "",
    type: row.type as PostType,
    topic: row.topic,
    status: row.status as PostStatus,
    template: row.template,
    slideKinds,
    caption: row.caption ?? "",
    tags: row.hashtags?.join(" ") ?? "",
    error: row.errorMessage ?? undefined,
    logs: logs.length ? logs : undefined,
  };
}
