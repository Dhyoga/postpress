export const DASHBOARD_NAV = [
  { href: "/dashboard", label: "Hari ini" },
  { href: "/dashboard/persona", label: "Persona" },
  { href: "/dashboard/plan", label: "Rencana konten" },
  { href: "/dashboard/queue", label: "Antrean" },
  { href: "/dashboard/history", label: "Riwayat" },
  { href: "/dashboard/template", label: "Template" },
  { href: "/dashboard/settings", label: "Pengaturan" },
] as const;

export const TOPBAR_TITLE: Record<string, string> = {
  "/dashboard": "Jumat, 31 Juli 2026",
  "/dashboard/persona": "Persona",
  "/dashboard/plan": "Rencana konten",
  "/dashboard/queue": "Antrean",
  "/dashboard/history": "Riwayat",
  "/dashboard/template": "Template",
  "/dashboard/settings": "Pengaturan",
};
