/** Notifikasi kegagalan job (Fase 5) — Telegram dan/atau email lewat Resend,
 * keduanya opsional lewat env var (.env.example). Kegagalan mengirim
 * notifikasi tidak boleh menggagalkan job itu sendiri, jadi semua di sini
 * best-effort dan tidak pernah melempar. */
export async function notifyJobFailure(jobName: string, detail: string): Promise<void> {
  const message = `Postpress: job "${jobName}" gagal.\n${detail}`;
  await Promise.all([notifyTelegram(message), notifyEmail(jobName, detail)]);
}

async function notifyTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
  } catch {
    // Diam-diam gagal — job utama sudah selesai, notifikasi cuma pelengkap.
  }
}

async function notifyEmail(jobName: string, detail: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO;
  const from = process.env.NOTIFY_EMAIL_FROM;
  if (!apiKey || !to || !from) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to, subject: `Postpress: job "${jobName}" gagal`, text: detail }),
    });
  } catch {
    // Sama seperti Telegram — best-effort.
  }
}
