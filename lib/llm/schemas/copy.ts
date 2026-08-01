import { z } from "zod";
import { slotContentSchema } from "@/lib/render/registry";

/**
 * Satu slide per `kind`, dibangun langsung dari `slotContentSchema()` di
 * lib/render/registry.ts — agents.md §B.2: "Spesifikasi slot dibuat dari
 * registry, bukan ditulis ulang di prompt." Kalau batas karakter berubah di
 * registry, validator copywriter ikut berubah otomatis tanpa disentuh di sini.
 */
const CoverSlideSchema = z.object({ kind: z.literal("cover") }).extend(slotContentSchema("cover").shape);
const PointSlideSchema = z.object({ kind: z.literal("point") }).extend(slotContentSchema("point").shape);
const QuoteSlideSchema = z.object({ kind: z.literal("quote") }).extend(slotContentSchema("quote").shape);
const CtaSlideSchema = z.object({ kind: z.literal("cta") }).extend(slotContentSchema("cta").shape);

export const SlideSchema = z.discriminatedUnion("kind", [
  CoverSlideSchema,
  PointSlideSchema,
  QuoteSlideSchema,
  CtaSlideSchema,
]);

export type CopySlide = z.infer<typeof SlideSchema>;

/** Caption maksimal 2.200 karakter (batas Instagram), hashtag 5-15 buah — design.md §6.2. */
export const CopySchema = z.object({
  slides: z.array(SlideSchema).min(1).max(10),
  caption: z.string().trim().min(1).max(2200),
  hashtags: z
    .array(z.string().trim().min(1).max(50))
    .min(5, "Minimal 5 hashtag")
    .max(15, "Maksimal 15 hashtag"),
});

export type Copy = z.infer<typeof CopySchema>;
