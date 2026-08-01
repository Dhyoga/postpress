import type { Persona, PersonaKeyword, PersonaSegment } from "@/lib/db/schema";

/** Instruksi tetap untuk agent Planner (design.md §6.1, agents.md §B.1).
 * Disimpan sebagai konstanta bernama di file terpisah (bukan string inline di
 * planner.ts) supaya perubahan prompt terlihat jelas di diff. */
export const PLANNER_SYSTEM_PROMPT = `Kamu adalah planner konten Instagram untuk sebuah akun bisnis di Indonesia.
Tugasmu: menyusun daftar tema konten untuk periode yang diminta, satu tema per hari kerja konten.

Aturan:
- Setiap tema HARUS relevan dengan brand, positioning, dan segmentasi audiens yang diberikan.
- Jangan mengulang topik yang sudah tayang dalam 60 hari terakhir (daftar diberikan di bawah).
- "template" pada tiap tema HARUS salah satu dari daftar template yang tersedia di bawah — jangan mengarang nama template baru.
- "type" adalah "single" untuk satu gambar atau "carousel" untuk beberapa slide.
- Tanggal harus berurutan dan dalam format YYYY-MM-DD, dimulai dari tanggal periode yang diberikan.
- Kamu HANYA mengisi tema, sudut pandang (angle), dan metadata jadwal — jangan menulis salinan (copy) atau caption di sini, itu tugas agent lain.
- Balas HANYA lewat pemanggilan tool yang disediakan.`;

interface PlannerInput {
  persona: Persona;
  segments: PersonaSegment[];
  topicKeywords: PersonaKeyword[];
  recentTopics: string[];
  periodStart: string;
  periodEnd: string;
  templateIds: string[];
}

export function buildPlannerUserPrompt(input: PlannerInput): string {
  const segmentLines = input.segments
    .map((s) => `- ${s.name} (${s.tier ?? "-"}): ${s.description ?? "-"} | pain point: ${s.painPoint ?? "-"} | kebutuhan: ${s.need ?? "-"}`)
    .join("\n") || "(belum ada segmentasi terisi)";

  const topicHints = input.topicKeywords.map((k) => k.value).join(", ") || "(tidak ada hint topik)";
  const recentTopicsList = input.recentTopics.length ? input.recentTopics.map((t) => `- ${t}`).join("\n") : "(belum ada riwayat topik)";

  return `# Persona akun
Nama brand: ${input.persona.brandName ?? "-"}
Tagline: ${input.persona.tagline ?? "-"}
Positioning: ${input.persona.positioning ?? "-"}
Yang harus dilakukan (dos): ${input.persona.dos ?? "-"}
Yang harus dihindari (don'ts): ${input.persona.donts ?? "-"}

# Segmentasi audiens
${segmentLines}

# Hint topik (kategori "topik" di kata kunci Persona, bukan daftar wajib)
${topicHints}

# Periode yang direncanakan
${input.periodStart} sampai ${input.periodEnd}

# Template yang tersedia (registry render)
${input.templateIds.join(", ")}

# 30 topik terakhir yang sudah tayang (jangan diulang)
${recentTopicsList}

Susun daftar tema untuk periode di atas.`;
}
