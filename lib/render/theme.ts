/** Token warna & font dipakai template Satori — nilai sama dengan `tailwind.config.ts`,
 * diduplikasi di sini karena Satori merender di luar pipeline Tailwind/PostCSS
 * (elemen React biasa dengan inline style, bukan className). */
export const COLORS = {
  paper: "#EFEEE8",
  paperHi: "#FBFAF6",
  ink: "#15171D",
  inkSoft: "#1E212A",
  ultra: "#2B2AE0",
  magenta: "#D4006E",
  slate: "#6C707B",
  rule: "#DAD8D0",
} as const;

export const FONTS = {
  display: "Bricolage Grotesque",
  body: "IBM Plex Sans",
  mono: "IBM Plex Mono",
} as const;

export const CANVAS = {
  width: 1080,
  height: 1350,
  padding: 72,
} as const;
