import type { Persona, PersonaKeyword } from "@/lib/db/schema";
import type { Theme } from "@/lib/llm/schemas/plan";

/** Instruksi tetap untuk agent Copywriter (design.md §6.2, agents.md §B.2).
 * Disimpan sebagai konstanta di file terpisah supaya perubahan prompt terlihat
 * di diff, bukan ditulis ulang inline tiap kali dipanggil. */
export const COPYWRITER_SYSTEM_PROMPT = `Kamu adalah copywriter Instagram untuk sebuah akun bisnis di Indonesia.
Tugasmu: mengubah SATU tema jadi teks per slide plus caption dan hashtag, mengikuti gaya bahasa (voice) akun.

Aturan:
- Isi HANYA slot teks yang diminta di spesifikasi template — jangan pernah menghasilkan HTML, CSS, atau instruksi layout apa pun.
- Batas karakter tiap slot itu batas KERAS — dicek otomatis sesudahnya, kalau terlampaui walau 1 karakter, hasil ditolak. Sebelum menjawab, hitung dulu panjang tiap teks yang akan kamu isi. Target 70-85% dari batas maksimal, JANGAN mepet ke batas.
- Jumlah slide HARUS sama dengan jumlah slide yang diminta, dengan "kind" yang sesuai urutan yang diberikan.
- Caption maksimal 2.200 karakter. Hashtag 5 sampai 15 buah, tanpa tanda "#", huruf kecil, tanpa spasi.
- Ikuti aturan bahasa (sapaan, istilah asing, format tanggal/angka, gaya judul) yang diberikan di bawah.
- Jangan pernah memakai emoji.
- Jangan memakai kata-kata di daftar "kata yang dilarang" di bawah, dalam bentuk apa pun (termasuk variasi ejaan).
- Balas HANYA lewat pemanggilan tool yang disediakan.`;

interface SlideSpec {
  kind: string;
  slots: Record<string, number>;
}

interface CopywriterInput {
  theme: Theme;
  persona: Persona;
  slideSpecs: SlideSpec[];
  ctaKeywords: PersonaKeyword[];
  forbiddenKeywords: PersonaKeyword[];
  /** Diisi hanya saat percobaan retry setelah kata terlarang lolos ke output. */
  avoidWords?: string[];
  /** Diisi hanya saat percobaan retry setelah output gagal validasi (mis.
   * slot kepanjangan) — pesan dari LlmError, sudah berisi nama slot & batasnya. */
  previousError?: string;
}

function formatSlots(spec: SlideSpec): string {
  return Object.entries(spec.slots)
    .map(([slot, max]) => `${slot} (maks ${max} karakter)`)
    .join(", ");
}

export function buildCopywriterUserPrompt(input: CopywriterInput): string {
  const slideSpecLines = input.slideSpecs.map((s, i) => `${i + 1}. kind="${s.kind}" — slot: ${formatSlots(s)}`).join("\n");
  const ctaBank = input.ctaKeywords.map((k) => k.value).join(", ") || "(tidak ada bank CTA, buat sendiri sesuai brand)";
  const forbidden = input.forbiddenKeywords.map((k) => k.value).join(", ") || "(tidak ada kata yang dilarang)";
  const voicePillars = Array.isArray(input.persona.voicePillars) ? (input.persona.voicePillars as string[]).join(", ") : "-";
  const voicePairs = Array.isArray(input.persona.voicePairs)
    ? (input.persona.voicePairs as { do: string; dont: string }[]).map((p) => `  - Lakukan: "${p.do}" — Hindari: "${p.dont}"`).join("\n")
    : "-";

  const retryNote = input.avoidWords?.length
    ? `\n\n# PERINGATAN — percobaan sebelumnya gagal
Output sebelumnya memakai kata yang dilarang: ${input.avoidWords.join(", ")}. Tulis ulang tanpa kata-kata itu sama sekali, termasuk bentuk lain/turunan katanya.`
    : input.previousError
      ? `\n\n# PERINGATAN — percobaan sebelumnya gagal validasi
${input.previousError}
Tulis ulang HANYA slot-slot yang disebutkan di atas dengan versi yang lebih pendek — potong sampai jelas di bawah batas karakternya, sisakan margin, jangan mepet.`
      : "";

  return `# Tema
Topik: ${input.theme.topic}
Sudut pandang: ${input.theme.angle}
Tipe: ${input.theme.type}

# Spesifikasi slide (urutan wajib diikuti)
${slideSpecLines}

# Gaya bahasa (voice) akun
Pilar suara: ${voicePillars}
Contoh berpasangan (few-shot):
${voicePairs}
Nilai inti: ${input.persona.coreValues ?? "-"}
Sapaan: ${input.persona.sapaan ?? "kamu"}
Istilah asing: ${input.persona.istilahAsing ?? "campur"}
Contoh format tanggal: ${input.persona.formatTanggalContoh ?? "-"}
Contoh format angka: ${input.persona.formatAngkaContoh ?? "-"}
Gaya judul: ${input.persona.gayaJudul ?? "sentence"}

# Bank pilihan CTA (untuk slide kind="cta")
${ctaBank}

# Kata yang dilarang muncul di output
${forbidden}${retryNote}

Tulis slide, caption, dan hashtag untuk tema di atas.`;
}
