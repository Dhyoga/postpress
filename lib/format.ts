const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Asia/Jakarta tidak pakai DST, jadi offset tetap +7 jam dari UTC cukup —
 * tidak perlu Intl.DateTimeFormat/timezone database untuk ini. Seluruh app
 * (jadwal cron, input "Buat post baru") berasumsi satu zona waktu WIB, lihat
 * `components/settings/SettingsView.tsx` field "WIB (UTC+7)". */
function toWib(d: Date): Date {
  return new Date(d.getTime() + WIB_OFFSET_MS);
}

/** Tanggal ("2026-08-01") dalam WIB dari instant UTC manapun. */
export function wibDateString(d: Date): string {
  return toWib(d).toISOString().slice(0, 10);
}

/** Jam ("19:00", 24-jam) dalam WIB dari instant UTC manapun. */
export function wibTimeString(d: Date): string {
  return toWib(d).toISOString().slice(11, 16);
}

const MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** Format tanggal ISO ("2026-08-01") jadi "1 Agu", opsional dengan jam ("1 Agu · 19:00"). */
export function formatDateId(date: string, time?: string): string {
  if (!date) return "Belum dijadwalkan";
  const [, month, day] = date.split("-");
  const monthLabel = MONTHS_ID[Number.parseInt(month, 10) - 1];
  const out = `${day} ${monthLabel}`;
  return time ? `${out} · ${time} WIB` : out;
}
