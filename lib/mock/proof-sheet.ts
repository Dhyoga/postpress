export type ProofSlideKind = "cover" | "point" | "quote" | "cta";

export type ProofSlideContent = {
  kind: ProofSlideKind;
  kicker: string;
  heading: string;
  body: string;
  /** URL JPEG hasil render sungguhan (lib/render + upload R2). Kalau ada,
   * UI wajib menampilkan gambar ini, bukan pratinjau HTML dari kicker/heading/
   * body — design.md §7.4: "Pratinjau HTML akan berbohong." */
  imageUrl?: string | null;
};
