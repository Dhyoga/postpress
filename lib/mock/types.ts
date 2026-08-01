// Sama dengan lib/types.ts (bentuk kolom `posts.status` sungguhan) — dipertahankan
// sebagai re-export di sini karena sebagian besar komponen UI masih import dari
// modul ini sejak era slicing mock data.
import type { PostStatus } from "@/lib/types";
export type { PostStatus };
export type PostType = "single" | "carousel";
export type SlideBlockKind = "cover" | "point" | "quote" | "cta";
export type TemplateId = "cover_list" | "point_grid" | "quote" | "cta_only";

export type PublishLogEntry = {
  phase: "container" | "carousel" | "publish";
  ok: boolean;
  time: string;
  detail?: string;
};

export type Post = {
  id: string;
  date: string;
  time: string;
  type: PostType;
  topic: string;
  status: PostStatus;
  template: TemplateId;
  slideKinds: SlideBlockKind[];
  caption: string;
  tags: string;
  igLink?: string;
  error?: string;
  logs?: PublishLogEntry[];
};

export type Plan = {
  id: string;
  date: string;
  topic: string;
  angle: string;
  type: PostType;
  template: TemplateId;
};
