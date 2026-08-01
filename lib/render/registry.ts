import { z } from "zod";
import type { Template, TemplateMeta } from "./types";
import { CoverTemplate } from "./templates/cover";
import { PointTemplate } from "./templates/point";
import { QuoteTemplate } from "./templates/quote";
import { CtaTemplate } from "./templates/cta";

/**
 * Satu sumber kebenaran untuk slot & batas karakter tiap template (design.md §7.3).
 * Dipakai untuk: render (lewat `element`), validasi Zod sebelum render, dan
 * generate spesifikasi slot di prompt copywriter (Fase 3) — kalau batas di sini
 * berubah, prompt dan validator ikut berubah otomatis.
 */
export const TEMPLATES: Template[] = [
  {
    meta: { id: "cover", name: "Cover", slots: { eyebrow: { max: 20 }, title: { max: 60 }, subtitle: { max: 90 } } },
    element: CoverTemplate,
  },
  {
    meta: { id: "point", name: "Point", slots: { index: { max: 2 }, heading: { max: 45 }, body: { max: 160 } } },
    element: PointTemplate,
  },
  {
    meta: { id: "quote", name: "Quote", slots: { quote: { max: 140 }, attribution: { max: 40 } } },
    element: QuoteTemplate,
  },
  {
    meta: { id: "cta", name: "CTA", slots: { headline: { max: 50 }, handle: { max: 30 } } },
    element: CtaTemplate,
  },
];

export const TEMPLATE_META: TemplateMeta[] = TEMPLATES.map((t) => t.meta);
export const TEMPLATE_IDS = TEMPLATES.map((t) => t.meta.id);

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.meta.id === id);
}

/** Dipakai copywriter (Fase 3) untuk tahu slot mana wajib diisi dan batas karakternya,
 * tanpa menulis ulang angka-angka itu di prompt. */
export function getSlotLimits(templateId: string): Record<string, number> {
  const template = getTemplate(templateId);
  if (!template) throw new Error(`Template "${templateId}" tidak ada di registry`);
  return Object.fromEntries(Object.entries(template.meta.slots).map(([slot, { max }]) => [slot, max]));
}

/** Bangun skema Zod untuk validasi slot konten sebuah template — dipakai render.ts
 * sebelum memanggil satori, dan validator copywriter (agents.md §3 aturan #3):
 * batas karakter tidak boleh cuma jadi teks di prompt. */
export function slotContentSchema(templateId: string): z.ZodObject<Record<string, z.ZodString>> {
  const template = getTemplate(templateId);
  if (!template) throw new Error(`Template "${templateId}" tidak ada di registry`);
  const shape: Record<string, z.ZodString> = {};
  for (const [slot, { max }] of Object.entries(template.meta.slots)) {
    shape[slot] = z.string().trim().min(1, `Slot "${slot}" wajib diisi`).max(max, `Slot "${slot}" maksimal ${max} karakter`);
  }
  return z.object(shape);
}

export function validateSlideContent(templateId: string, content: unknown): Record<string, string> {
  return slotContentSchema(templateId).parse(content);
}
