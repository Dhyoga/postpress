export type DashboardStat = {
  label: string;
  value: string;
  valueSuffix?: string;
  meta: string;
};

// TODO: ganti ke query agregat (jadwal cron, ringkasan publish minggu ini,
// sisa kuota content_publishing_limit dari Graph API — design.md §8.4) setelah backend siap.
export const DASHBOARD_STATS: DashboardStat[] = [
  {
    label: "Cron berikutnya",
    value: "06:00",
    valueSuffix: "WIB",
    meta: "Menyiapkan draf untuk 1 Agustus",
  },
  {
    label: "Terbit minggu ini",
    value: "5",
    valueSuffix: "/ 7",
    meta: "1 gagal, 1 menunggu review",
  },
  {
    label: "Sisa kuota publikasi",
    value: "23",
    valueSuffix: "/ 25",
    meta: "Reset bergulir tiap 24 jam",
  },
];
