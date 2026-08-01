export type PostStatus = "draft" | "generating" | "needs_review" | "approved" | "rejected" | "publishing" | "published" | "failed";

export type PostType = "single" | "carousel";

export type TemplateId = "cover" | "point" | "quote" | "cta" | "cover_list";

export type SlideKind = "cover" | "point" | "cta";

export type SlideContent = Record<string, string>;

export type PublishPhase = "container" | "carousel" | "publish";

export interface Post {
  id: string;
  accountId: string;
  planId?: string | null;
  type: PostType;
  template: TemplateId;
  topic: string;
  caption?: string | null;
  hashtags?: string[];
  status: PostStatus;
  scheduledFor?: string | null;
  publishedAt?: string | null;
  igMediaId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface Slide {
  id: string;
  postId: string;
  position: number;
  kind: SlideKind;
  content: SlideContent;
  imageUrl?: string | null;
}

export interface PublishLog {
  id: string;
  postId: string;
  attempt: number;
  phase: PublishPhase;
  request?: Record<string, unknown> | null;
  response?: Record<string, unknown> | null;
  ok: boolean;
  createdAt: string;
}

export interface Plan {
  id: string;
  accountId: string;
  periodStart: string;
  periodEnd: string;
  themes: unknown[];
  createdBy?: string | null;
  createdAt: string;
}

export interface Persona {
  id: string;
  accountId: string;
  brandName?: string | null;
  tagline?: string | null;
  positioning?: string | null;
  dos?: string | null;
  donts?: string | null;
  contentMix?: Record<string, unknown> | null;
  postFrequency?: number | null;
  voicePillars?: string[] | null;
  voicePairs?: Array<{ do: string; dont: string }> | null;
  coreValues?: string | null;
  sapaan?: string | null;
  istilahAsing?: string | null;
  formatTanggalContoh?: string | null;
  formatAngkaContoh?: string | null;
  gayaJudul?: string | null;
  colors?: Record<string, string> | null;
  fonts?: Record<string, string> | null;
  visualLarangan?: string | null;
  updatedAt: string;
}

export interface PersonaSegment {
  id: string;
  personaId: string;
  name: string;
  tier?: string | null;
  description?: string | null;
  painPoint?: string | null;
  need?: string | null;
}

export interface PersonaKeyword {
  id: string;
  personaId: string;
  category: string;
  value: string;
}
