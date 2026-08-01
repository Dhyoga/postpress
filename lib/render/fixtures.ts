import type { SlideContent } from "./types";

/** Konten contoh persis di batas karakter maksimum tiap slot (bukan teks pendek
 * yang nyaman) — dipakai CLI `render:preview` dan snapshot test, supaya teks
 * meluber (agents.md §1 risiko) ketahuan sebelum sampai ke produksi. */
export const MAX_LENGTH_FIXTURES: Record<string, SlideContent> = {
  cover: {
    eyebrow: "PANDUAN FREELANCE X",
    title: "Lima kesalahan freelancer pemula yang bikin capek tapi kere",
    subtitle: "Yang bikin kamu kerja keras seharian tapi saldo rekening tetap begitu-begitu saja",
  },
  point: {
    index: "01",
    heading: "Pasang harga dari rasa takut, bukan nilai",
    body: "Kamu banting harga karena takut ditolak, padahal klien yang tepat justru curiga sama harga yang terlalu murah untuk kerja sekelas ini.",
  },
  quote: {
    quote: "Harga murah tidak membuatmu lebih mudah dipilih — itu cuma membuatmu lebih mudah diremehkan klien.",
    attribution: "Catatan Freelancer, Edisi Ketiga",
  },
  cta: {
    headline: "Simpan panduan ini, share ke rekan freelancer kamu",
    handle: "@kelasfreelance.id",
  },
};

/** Carousel contoh 7 slide (1 cover + 5 point + 1 cta) — dipakai `render:preview carousel`
 * untuk memenuhi kriteria selesai roadmap.md Fase 2 ("perintah CLI menghasilkan 7 JPEG"). */
export const DEMO_CAROUSEL: Array<{ template: string; content: SlideContent }> = [
  { template: "cover", content: MAX_LENGTH_FIXTURES.cover },
  { template: "point", content: { ...MAX_LENGTH_FIXTURES.point, index: "01" } },
  {
    template: "point",
    content: {
      index: "02",
      heading: "Tidak punya kontrak, cuma janji lisan di chat",
      body: "Tanpa kontrak, revisi tak berbatas jadi norma dan pembayaran telat tidak punya konsekuensi yang bisa kamu tagih balik.",
    },
  },
  {
    template: "point",
    content: {
      index: "03",
      heading: "Kerja tanpa scope jelas, proyek jadi bengkak",
      body: "Klien minta 'sedikit revisi' berkali-kali karena dari awal tidak ada batas jelas apa yang termasuk dan apa yang di luar paket.",
    },
  },
  {
    template: "point",
    content: {
      index: "04",
      heading: "Nagih invoice belakangan, bukan di depan",
      body: "Down payment di awal bukan cuma soal uang cash — itu juga cara menyaring klien yang serius dari yang cuma coba-coba.",
    },
  },
  {
    template: "point",
    content: {
      index: "05",
      heading: "Menolak naik harga meski permintaan bertambah",
      body: "Kalau lingkup kerja bertambah tapi harga tetap, kamu sedang mendanai proyek klien pakai waktu dan tenagamu sendiri.",
    },
  },
  { template: "cta", content: MAX_LENGTH_FIXTURES.cta },
];
