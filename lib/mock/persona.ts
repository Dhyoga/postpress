export type ContentMix = {
  edukasi: number;
  studiKasus: number;
  promosi: number;
  hiburan: number;
};

export type VoicePair = { do: string; dont: string };

export type Sapaan = "kamu" | "anda" | "campur";
export type IstilahAsing = "pertahankan" | "indonesia" | "campur";
export type GayaJudul = "sentence" | "title";

export type PersonaBranding = {
  name: string;
  tagline: string;
  positioning: string;
  dos: string;
  donts: string;
  mix: ContentMix;
  frequency: number;
};

export type PersonaDna = {
  pillars: string[];
  pairs: VoicePair[];
  values: string;
  sapaan: Sapaan;
  istilahAsing: IstilahAsing;
  formatTanggal: string;
  formatAngka: string;
  gayaJudul: GayaJudul;
};

export type PersonaColors = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
};

export type PersonaFonts = { display: string; body: string; mono: string };

export type PersonaVisual = {
  colors: PersonaColors;
  fonts: PersonaFonts;
  larangan: string;
};

export type PersonaState = {
  branding: PersonaBranding;
  dna: PersonaDna;
  visual: PersonaVisual;
};

export type SegmentTier = "Utama" | "Sekunder";

export type Segment = {
  id: string;
  name: string;
  tier: SegmentTier;
  desc: string;
  painPoint: string;
  need: string;
};

export type KeywordCategory = "topik" | "hashtag" | "larangan" | "cta";
export type Keywords = Record<KeywordCategory, string[]>;

// Data statis untuk slicing UI persona (branding/DNA/segmentasi/visual/kata kunci).
// TODO: ganti ke query lib/db/queries/ tabel personas/persona_segments/persona_keywords
// (design.md §4.1) setelah Supabase siap. Endpoint create/update wajib sama untuk
// input manual maupun hasil import Excel (agents.md aturan #6).
export const MOCK_PERSONA: PersonaState = {
  branding: {
    name: "Kelas Freelance",
    tagline: "Belajar freelance tanpa drama",
    positioning: "Kami bantu freelancer pemula dapat klien pertama tanpa banting harga.",
    dos: "Bahasa santai, contoh angka nyata, ajakan yang konkret.",
    donts: "Jargon korporat, motivasi kosong tanpa langkah nyata.",
    mix: { edukasi: 40, studiKasus: 20, promosi: 20, hiburan: 20 },
    frequency: 5,
  },
  dna: {
    pillars: ["Santai", "Blak-blakan", "Suportif"],
    pairs: [
      {
        do: "Kamu banting harga karena takut ditolak.",
        dont: "Penetapan harga yang tidak strategis dapat merugikan freelancer.",
      },
      {
        do: "DP 50% itu bukan tidak sopan, itu standar.",
        dont: "Mohon pertimbangkan untuk meminta pembayaran di muka.",
      },
    ],
    values: "Transparansi, kerja jujur, bantu tanpa menggurui.",
    sapaan: "kamu",
    istilahAsing: "campur",
    formatTanggal: "1 Agu 2026",
    formatAngka: "Rp150.000",
    gayaJudul: "sentence",
  },
  visual: {
    colors: {
      primary: "#2B2AE0",
      secondary: "#15171D",
      accent: "#D4006E",
      background: "#EFEEE8",
      text: "#15171D",
    },
    fonts: { display: "Bricolage Grotesque", body: "IBM Plex Sans", mono: "IBM Plex Mono" },
    larangan: "Jangan pakai stock photo generik. Hindari emoji berlebihan, maksimal satu per slide.",
  },
};

// Varian kosong, dipakai lewat ?mock=empty (lib/hooks/use-mock-query.ts) untuk melihat
// tampilan empty state tanpa perlu menghapus data sungguhan.
export const MOCK_SEGMENTS_EMPTY: Segment[] = [];
export const MOCK_KEYWORDS_EMPTY: Keywords = { topik: [], hashtag: [], larangan: [], cta: [] };

export const MOCK_SEGMENTS: Segment[] = [
  {
    id: "seg1",
    name: "Freelancer pemula 0-2 tahun",
    tier: "Utama",
    desc: "Baru lepas dari kerja kantoran atau baru lulus, belum punya portofolio kuat.",
    painPoint: "Takut menetapkan harga, sering kerja di bawah tarif layak.",
    need: "Contoh angka konkret dan bahasa yang tidak menggurui.",
  },
  {
    id: "seg2",
    name: "Freelancer 2-5 tahun, mau naik kelas",
    tier: "Sekunder",
    desc: "Sudah punya klien tetap, ingin menaikkan tarif atau pindah ke klien lebih besar.",
    painPoint: "Bingung kapan waktu yang tepat menaikkan harga.",
    need: "Kerangka berpikir, bukan motivasi.",
  },
];

export const MOCK_KEYWORDS: Keywords = {
  topik: ["rate freelance", "kontrak kerja", "klien red flag", "invoice"],
  hashtag: ["#freelanceindonesia", "#kerjaremote", "#freelancerpemula"],
  larangan: ["dijamin kaya", "tanpa kerja keras", "auto sukses"],
  cta: ["Simpan buat nanti", "Komen pengalaman kamu", "DM kami buat konsultasi"],
};

export const KEYWORD_LABELS: Record<KeywordCategory, string> = {
  topik: "kata kunci topik",
  hashtag: "hashtag",
  larangan: "kata terlarang",
  cta: "CTA",
};
