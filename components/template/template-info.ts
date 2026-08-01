// Deskripsi & contoh isi tiap template Satori — teks presentasi murni untuk halaman
// Template, bukan data yang berasal dari database. Id/batas karakter sungguhan tetap
// satu sumber kebenaran di lib/render/registry.ts (lihat /api/templates).
export type TemplateInfo = {
  desc: string;
  /** Kelas CSS pratinjau. Belum ada styling khusus untuk `quote`, jadi dipinjam dari `point`. */
  canvasClass: string;
  example: Record<string, string>;
};

export const TEMPLATE_INFO: Record<string, TemplateInfo> = {
  cover: {
    desc: "Slide pembuka carousel: judul besar dengan eyebrow kecil di atas dan subjudul pendek di bawah.",
    canvasClass: "slide__canvas--cover",
    example: {
      eyebrow: "Panduan",
      title: "5 kesalahan freelancer pemula",
      subtitle: "Yang bikin kamu kerja keras tapi tetap kere",
    },
  },
  point: {
    desc: "Satu poin bernomor dengan judul dan penjelasan singkat. Post carousel selalu memakai tiga slide point berturut-turut.",
    canvasClass: "slide__canvas--point",
    example: {
      index: "01",
      heading: "Pasang harga dari rasa takut",
      body: "Kamu banting harga karena takut ditolak. Klien yang datang justru paling banyak menuntut.",
    },
  },
  quote: {
    desc: "Satu kutipan atau pernyataan tunggal dengan atribusi kecil. Untuk post single yang reflektif, bukan listicle.",
    canvasClass: "slide__canvas--point",
    example: {
      quote: "Kalau kalender kamu penuh tiga bulan ke depan, itu sinyal waktunya naikin harga.",
      attribution: "@kelasfreelance.id",
    },
  },
  cta: {
    desc: "Slide ajakan bertindak. Selalu jadi slide penutup carousel, atau berdiri sendiri untuk pengumuman/promosi.",
    canvasClass: "slide__canvas--cta",
    example: {
      headline: "Mana yang paling sering kamu lakukan?",
      handle: "@kelasfreelance.id",
    },
  },
};

export function getTemplateInfo(id: string): TemplateInfo {
  return TEMPLATE_INFO[id] ?? { desc: "Template kustom, belum ada deskripsi.", canvasClass: "slide__canvas--point", example: {} };
}
