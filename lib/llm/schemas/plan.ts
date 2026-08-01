import { z } from "zod";
import { TEMPLATE_IDS } from "@/lib/render/registry";

const TEMPLATE_ENUM = TEMPLATE_IDS as [string, ...string[]];

/** Satu tema hasil planner. `template` divalidasi terhadap registry Satori
 * (agents.md §B.1: "tiap tema harus memetakan ke template yang benar-benar
 * ada di registry — kalau tidak, validasi menolaknya"). */
export const ThemeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus format YYYY-MM-DD"),
  topic: z.string().trim().min(1).max(300),
  angle: z.string().trim().min(1).max(300),
  type: z.enum(["single", "carousel"]),
  template: z.enum(TEMPLATE_ENUM),
});

export type Theme = z.infer<typeof ThemeSchema>;

/** Skema mentah dipakai untuk minta tool-use terstruktur dari LLM (JSON
 * Schema-nya harus tetap murni objek — tanpa `.refine`, karena refine tidak
 * bisa direpresentasikan sebagai JSON Schema). */
export const PlanSchema = z.object({
  themes: z.array(ThemeSchema).min(1).max(31),
});

export type Plan = z.infer<typeof PlanSchema>;

/** Aturan bisnis di luar bentuk data: topik tidak boleh mengulang topik yang
 * sudah tayang 60 hari terakhir (design.md §6.1). Dicek terpisah dari Zod
 * karena butuh daftar `recentTopics` yang dilewatkan dari luar skema. */
export function findRepeatedTopics(plan: Plan, recentTopics: string[]): string[] {
  const recentLower = new Set(recentTopics.map((t) => t.trim().toLowerCase()));
  return plan.themes.map((t) => t.topic).filter((topic) => recentLower.has(topic.trim().toLowerCase()));
}
