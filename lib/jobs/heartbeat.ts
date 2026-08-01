/**
 * Pemantauan uptime cron (Fase 6) — pola "ping saat selesai" ala
 * healthchecks.io/Cronitor/BetterUptime: job memberi tahu "saya baru saja
 * jalan", dan layanan pemantau itulah yang mengirim alert kalau ping tidak
 * datang dalam jendela waktu yang diharapkan. Tidak menambah dependensi atau
 * infrastruktur baru di sini — cuma `fetch` ke URL yang dikonfigurasi lewat
 * `CRON_HEARTBEAT_BASE_URL` (lihat .env.example). Kosong = tidak memantau.
 */
export async function pingHeartbeat(jobName: string): Promise<void> {
  const baseUrl = process.env.CRON_HEARTBEAT_BASE_URL;
  if (!baseUrl) return;
  try {
    await fetch(`${baseUrl.replace(/\/+$/, "")}/${jobName}`);
  } catch {
    // Ping yang gagal tidak boleh menggagalkan job yang baru saja selesai.
  }
}
