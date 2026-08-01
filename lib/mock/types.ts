// Sama dengan lib/types.ts (bentuk kolom `posts.status` sungguhan) — dipertahankan
// sebagai re-export di sini karena sebagian besar komponen UI masih import dari
// modul ini sejak era slicing mock data.
import type { PostStatus } from "@/lib/types";
export type { PostStatus };
export type PostType = "single" | "carousel";
export type SlideBlockKind = "cover" | "point" | "quote" | "cta";

/** Satu baris timeline lifecycle post yang bisa dibaca manusia ("Disetujui",
 * "Sedang diproses ke Instagram", dst) — sumbernya tabel `post_events`,
 * BUKAN `publish_logs` (yang mencatat detail teknis tiap panggilan Graph API
 * per percobaan publish, dipakai debugging bukan ditampilkan ke pengguna). */
export type PostEventEntry = {
  message: string;
  ok: boolean;
  time: string;
};

/** `template` sengaja `string`, bukan union tetap — id template sungguhan berasal dari
 * registry Satori (lib/render/registry.ts, lihat /api/templates), tidak dikunci di sini. */
export type Post = {
  id: string;
  date: string;
  time: string;
  type: PostType;
  topic: string;
  status: PostStatus;
  template: string;
  slideKinds: SlideBlockKind[];
  caption: string;
  tags: string;
  igLink?: string;
  error?: string;
  logs?: PostEventEntry[];
};
