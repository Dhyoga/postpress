export type PostStatus = "draft" | "review" | "approved" | "published" | "failed";
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
