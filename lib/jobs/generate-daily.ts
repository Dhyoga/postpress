import { ThemeSchema, type Theme } from "@/lib/llm/schemas/plan";
import { generatePostContent } from "@/lib/jobs/generate";
import { listActiveAccounts, listContentPlans, findPostByTopic, createPost } from "@/lib/db/queries";
import { wibDateString } from "@/lib/format";
import { notifyJobFailure } from "./notify";

interface GenerateDailyResult {
  accountId: string;
  postId: string | null;
  skipped?: string;
  failed?: string;
}

/** `generate:daily` (design.md §10, tiap hari 06:00 WIB) — ambil tema besok
 * dari content plan, generate post kalau belum ada (idempoten), lalu jalankan
 * pipeline yang sama dengan tombol "Generate sekarang" (Fase 3). */
export async function runGenerateDaily(): Promise<GenerateDailyResult[]> {
  const targetDate = wibDateString(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const accounts = await listActiveAccounts();
  const results: GenerateDailyResult[] = [];

  for (const account of accounts) {
    const plans = await listContentPlans(account.id);
    let theme: Theme | null = null;
    let planId: string | null = null;
    for (const plan of plans) {
      const parsed = ThemeSchema.array().safeParse(plan.themes);
      if (!parsed.success) continue;
      const match = parsed.data.find((t) => t.date === targetDate);
      if (match) {
        theme = match;
        planId = plan.id;
        break;
      }
    }

    if (!theme) {
      results.push({ accountId: account.id, postId: null, skipped: `Tidak ada tema di rencana konten untuk ${targetDate}` });
      continue;
    }

    const existing = await findPostByTopic(account.id, theme.topic);
    if (existing) {
      results.push({ accountId: account.id, postId: existing.id, skipped: "Post untuk tema ini sudah pernah dibuat" });
      continue;
    }

    const [post] = await createPost({
      accountId: account.id,
      planId,
      type: theme.type,
      template: theme.template,
      topic: theme.topic,
      status: "draft",
      scheduledFor: new Date(`${targetDate}T10:00:00+07:00`),
    });

    try {
      await generatePostContent(post.id, theme.angle);
      results.push({ accountId: account.id, postId: post.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal generate post harian";
      results.push({ accountId: account.id, postId: post.id, failed: message });
      await notifyJobFailure("generate:daily", `Akun ${account.handle}: ${message}`);
    }
  }

  return results;
}
