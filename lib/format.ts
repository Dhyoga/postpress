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
  return time ? `${out} · ${time}` : out;
}
