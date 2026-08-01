import type { PostStatus, PostType } from "@/lib/types";
import type { PublishLogEntry } from "@/lib/mock/types";

type SlideRow = { position: number; kind: string };
type PublishLogRow = { phase: string; ok: boolean; createdAt: Date | string };

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
  publishLogs?: PublishLogRow[];
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
  const logs: PublishLogEntry[] = (row.publishLogs ?? []).map((log) => ({
    phase: log.phase as PublishLogEntry["phase"],
    ok: log.ok,
    time: new Date(log.createdAt).toISOString().slice(11, 16),
  }));

  return {
    id: row.id,
    date: scheduled ? scheduled.toISOString().slice(0, 10) : "",
    time: scheduled ? scheduled.toISOString().slice(11, 16) : "",
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
