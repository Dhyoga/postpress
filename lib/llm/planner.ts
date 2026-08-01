import { callStructured, LlmError } from "@/lib/llm/client";
import { PlanSchema, findRepeatedTopics, type Plan } from "@/lib/llm/schemas/plan";
import { PLANNER_SYSTEM_PROMPT, buildPlannerUserPrompt } from "@/lib/llm/prompts/planner";
import { getPersonaByAccount, listSegments, listKeywords, listRecentTopics } from "@/lib/db/queries";
import { TEMPLATE_IDS } from "@/lib/render/registry";

export class PlannerFailedError extends Error {}

/**
 * Menyusun content plan untuk satu akun (dipanggil `plan:weekly`, lihat
 * agents.md §B.1). Validasi + retry sekali + jatuh ke gagal — sama seperti
 * copywriter (design.md §6.3 aturan #2), supaya satu kegagalan sesaat LLM
 * tidak langsung menghentikan seluruh cron.
 */
export async function generatePlan(accountId: string, periodStart: string, periodEnd: string): Promise<Plan> {
  const persona = await getPersonaByAccount(accountId);
  if (!persona) {
    throw new PlannerFailedError("Persona akun belum diisi — lengkapi Persona sebelum membuat rencana konten.");
  }
  const [segments, keywords, recentTopics] = await Promise.all([
    listSegments(persona.id),
    listKeywords(persona.id),
    listRecentTopics(accountId, 30),
  ]);
  const topicKeywords = keywords.filter((k) => k.category === "topik");

  const basePrompt = {
    persona,
    segments,
    topicKeywords,
    recentTopics,
    periodStart,
    periodEnd,
    templateIds: TEMPLATE_IDS,
  };

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const plan = await callStructured({
        system: PLANNER_SYSTEM_PROMPT,
        user: buildPlannerUserPrompt(basePrompt),
        schema: PlanSchema,
        toolName: "submit_content_plan",
        toolDescription: "Kirim daftar tema konten untuk periode yang diminta.",
      });

      const repeated = findRepeatedTopics(plan, recentTopics);
      if (repeated.length > 0) {
        if (attempt === 2) {
          throw new PlannerFailedError(`Rencana konten mengulang topik yang sudah tayang: ${repeated.join(", ")}.`);
        }
        continue;
      }

      return plan;
    } catch (err) {
      if (err instanceof PlannerFailedError) throw err;
      if (attempt === 2) {
        const message = err instanceof LlmError ? err.message : "Gagal membuat rencana konten.";
        throw new PlannerFailedError(message);
      }
    }
  }

  throw new PlannerFailedError("Gagal membuat rencana konten setelah dua percobaan.");
}
