import { listActiveAccounts, createContentPlan } from "@/lib/db/queries";
import { generatePlan, PlannerFailedError } from "@/lib/llm/planner";
import { notifyJobFailure } from "./notify";

export interface PlanWeeklyResult {
  accountId: string;
  planId?: string;
  themeCount?: number;
  failed?: string;
}

/** `plan:weekly` (design.md §10, Minggu 05:00 WIB) — susun content plan 7 hari
 * ke depan untuk tiap akun aktif. */
export async function runPlanWeekly(): Promise<PlanWeeklyResult[]> {
  const accounts = await listActiveAccounts();
  const periodStart = new Date();
  const periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const results: PlanWeeklyResult[] = [];

  for (const account of accounts) {
    try {
      const plan = await generatePlan(account.id, periodStart.toISOString().slice(0, 10), periodEnd.toISOString().slice(0, 10));
      const [row] = await createContentPlan({
        accountId: account.id,
        periodStart,
        periodEnd,
        themes: plan.themes,
      });
      results.push({ accountId: account.id, planId: row.id, themeCount: plan.themes.length });
    } catch (err) {
      const message = err instanceof PlannerFailedError ? err.message : "Gagal membuat rencana konten mingguan";
      results.push({ accountId: account.id, failed: message });
      await notifyJobFailure("plan:weekly", `Akun ${account.handle}: ${message}`);
    }
  }

  return results;
}
