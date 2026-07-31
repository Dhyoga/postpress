export type ProofSlideKind = "cover" | "point" | "cta";

export type ProofSlideContent = {
  kind: ProofSlideKind;
  kicker: string;
  heading: string;
  body: string;
};

// Konten penuh 7 slide untuk proof sheet "Hari ini" (post1, lihat lib/mock/posts.ts).
// Terpisah dari Post karena isi per-slide sesungguhnya ada di tabel `slides` (design.md §4).
// TODO: ganti ke query lib/db/queries/slides setelah render pipeline (Fase 2) tersedia.
export const TODAY_PROOF_SLIDES: ProofSlideContent[] = [
  {
    kind: "cover",
    kicker: "Panduan",
    heading: "5 kesalahan freelancer pemula",
    body: "Yang bikin kamu kerja keras tapi tetap kere",
  },
  {
    kind: "point",
    kicker: "01",
    heading: "Pasang harga dari rasa takut",
    body: "Kamu banting harga karena takut ditolak. Klien yang datang justru paling banyak menuntut.",
  },
  {
    kind: "point",
    kicker: "02",
    heading: "Kerja tanpa kontrak",
    body: "Chat WhatsApp bukan kesepakatan. Satu halaman scope dan termin sudah cukup melindungi.",
  },
  {
    kind: "point",
    kicker: "03",
    heading: "Tidak minta uang muka",
    body: "DP 50% menyaring klien yang tidak serius sebelum kamu buang waktu sebulan.",
  },
  {
    kind: "point",
    kicker: "04",
    heading: "Terima revisi tanpa batas",
    body: "Tulis jumlah revisi di penawaran. Selebihnya dihitung sebagai pekerjaan baru.",
  },
  {
    kind: "point",
    kicker: "05",
    heading: "Lupa menghitung pajak",
    body: "Penghasilan kotor bukan penghasilan kamu. Sisihkan sejak invoice pertama cair.",
  },
  {
    kind: "cta",
    kicker: "Simpan buat nanti",
    heading: "Mana yang paling sering kamu lakukan?",
    body: "@kelasfreelance.id",
  },
];
