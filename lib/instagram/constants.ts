/**
 * Handle contoh dipakai di teks presentasi (halaman Template, fixture CLI
 * `render:preview`, snapshot render) — bukan akun sungguhan mana pun. Akun
 * yang benar-benar tersambung datang dari `ig_accounts` lewat
 * `/api/settings/ig-accounts`. Bisa dioverride per lingkungan kalau demo
 * butuh handle contoh yang lain.
 */
export const EXAMPLE_IG_HANDLE = process.env.NEXT_PUBLIC_EXAMPLE_IG_HANDLE ?? "@akun.instagram.kamu";
