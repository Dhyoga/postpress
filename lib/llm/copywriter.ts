import { callStructured, LlmError } from "@/lib/llm/client";
import { CopySchema, type Copy } from "@/lib/llm/schemas/copy";
import { COPYWRITER_SYSTEM_PROMPT, buildCopywriterUserPrompt } from "@/lib/llm/prompts/copywriter";
import { getPersonaByAccount, listKeywords } from "@/lib/db/queries";
import { getSlotLimits } from "@/lib/render/registry";
import type { Theme } from "@/lib/llm/schemas/plan";

export class CopywriterFailedError extends Error {}

/** Kerangka slide tiap post — LLM tidak pernah memutuskan urutan/kind slide
 * (agents.md §B.3: "Pilihan layout dan styling → template hardcoded"), cuma
 * mengisi teksnya. Post "single" pakai template pilihan planner apa adanya;
 * "carousel" selalu cover -> 3 point -> cta, kerangka tetap yang sama dipakai
 * `render:preview carousel` di Fase 2. */
export function slideSkeleton(theme: Theme): string[] {
  if (theme.type === "single") return [theme.template];
  return ["cover", "point", "point", "point", "cta"];
}

function collectText(copy: Copy): string {
  const slideText = copy.slides.flatMap((s) => Object.values(s).filter((v): v is string => typeof v === "string"));
  return [...slideText, copy.caption, ...copy.hashtags].join(" \n ").toLowerCase();
}

/** Dicek SETELAH output kembali, bukan cuma diserahkan ke kepatuhan prompt
 * (agents.md §B aturan wajib #2 & design.md §6.3 aturan #6). */
export function findForbiddenWords(copy: Copy, forbidden: string[]): string[] {
  const haystack = collectText(copy);
  return forbidden.filter((word) => word.trim() && haystack.includes(word.trim().toLowerCase()));
}

function matchesSkeleton(copy: Copy, skeleton: string[]): boolean {
  return copy.slides.length === skeleton.length && copy.slides.every((s, i) => s.kind === skeleton[i]);
}

/**
 * Mengubah satu tema jadi copy siap render (dipanggil `generate:daily`, lihat
 * agents.md §B.2). Validasi + retry sekali dengan instruksi eksplisit
 * menghindari kata terlarang, lalu jatuh ke gagal (design.md §6.3 aturan #6).
 */
export async function generateCopy(accountId: string, theme: Theme): Promise<Copy> {
  const persona = await getPersonaByAccount(accountId);
  if (!persona) {
    throw new CopywriterFailedError("Persona akun belum diisi — lengkapi Persona sebelum generate copy.");
  }
  const keywords = await listKeywords(persona.id);
  const ctaKeywords = keywords.filter((k) => k.category === "cta");
  const forbiddenKeywords = keywords.filter((k) => k.category === "larangan");
  const forbiddenWords = forbiddenKeywords.map((k) => k.value);

  const skeleton = slideSkeleton(theme);
  const slideSpecs = skeleton.map((kind) => ({ kind, slots: getSlotLimits(kind) }));

  let avoidWords: string[] | undefined;
  let previousError: string | undefined;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const copy = await callStructured({
        system: COPYWRITER_SYSTEM_PROMPT,
        user: buildCopywriterUserPrompt({ theme, persona, slideSpecs, ctaKeywords, forbiddenKeywords, avoidWords, previousError }),
        schema: CopySchema,
        toolName: "submit_copy",
        toolDescription: "Kirim teks slide, caption, dan hashtag untuk tema yang diminta.",
      });

      if (!matchesSkeleton(copy, skeleton)) {
        if (attempt === 2) {
          throw new CopywriterFailedError("Jumlah atau urutan slide dari LLM tidak sesuai kerangka template.");
        }
        continue;
      }

      const hits = findForbiddenWords(copy, forbiddenWords);
      if (hits.length > 0) {
        if (attempt === 2) {
          throw new CopywriterFailedError(`Copy masih memuat kata yang dilarang: ${hits.join(", ")}.`);
        }
        avoidWords = hits;
        continue;
      }

      return copy;
    } catch (err) {
      if (err instanceof CopywriterFailedError) throw err;
      if (attempt === 2) {
        const message = err instanceof LlmError ? err.message : "Gagal membuat copy.";
        throw new CopywriterFailedError(message);
      }
      previousError = err instanceof LlmError ? err.message : undefined;
    }
  }

  throw new CopywriterFailedError("Gagal membuat copy setelah dua percobaan.");
}
