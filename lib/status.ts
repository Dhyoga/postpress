import type { PostStatus } from "@/lib/mock/types";

/** Status yang masih dianggap "belum tayang" — ditampilkan di rail badge & Antrean. */
export const QUEUE_STATUSES: PostStatus[] = ["review", "approved", "draft"];

export const STATUS_LABEL: Record<PostStatus, string> = {
  review: "Menunggu review",
  approved: "Disetujui",
  draft: "Draf",
  published: "Terbit",
  failed: "Gagal",
};

export const STATUS_CHIP_CLASS: Record<PostStatus, string> = {
  review: "chip--review",
  approved: "chip--approved",
  draft: "chip--draft",
  published: "chip--live",
  failed: "chip--failed",
};
