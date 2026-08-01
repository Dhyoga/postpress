# Postpress

Tool internal untuk membuat, meninjau, dan menerbitkan konten Instagram secara semi-otomatis.
Next.js + Postgres (Drizzle). Gambar dirender dengan Satori, diterbitkan lewat Instagram Graph API.

Lihat `design.md` untuk detail arsitektur dan `agents.md` untuk konvensi kerja di repo ini.

## Setup

```bash
pnpm install
cp .env.example .env   # isi semua nilai, lihat penjelasan tiap variabel di bawah
pnpm db:generate        # (opsional) buat migration baru dari perubahan skema
pnpm db:migrate         # terapkan migration ke database
pnpm cli user:create <username>   # buat akun admin pertama, akan menanyakan password interaktif
pnpm dev                # http://localhost:3000
```

## Environment variables

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ya | Connection string Postgres (Supabase pooler, mode `session`/port 6543 untuk app, atau direct 5432 untuk migration panjang). |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` | opsional | Hanya kalau ada fitur yang memakai Supabase SDK langsung (storage, realtime). Query data utama tetap lewat Drizzle. |
| `SESSION_SECRET` | ya | Random hex 32 byte, dipakai untuk menandatangani sesi. `openssl rand -hex 32`. |
| `TOKEN_ENCRYPTION_KEY` | ya | Random hex 32 byte, dipakai AES-256-GCM untuk enkripsi token Instagram di kolom `ig_accounts.token_encrypted`. |
| `CRON_SECRET` | ya | Token bearer yang wajib dikirim endpoint `app/api/cron/*` (`Authorization: Bearer <CRON_SECRET>`). |
| `ANTHROPIC_AUTH_TOKEN` / `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL` | opsional | Fallback klien LLM (format Anthropic Messages API) kalau belum ada konfigurasi tersimpan di database. Provider, base URL, API key, dan model normalnya diatur lewat Pengaturan → Konfigurasi LLM (disimpan terenkripsi di tabel `llm_settings`); lihat `openspec/changes/dynamic-llm-settings-in-db`. |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | ya (Fase 2+) | Kredensial Cloudflare R2 untuk upload JPEG hasil render. |
| `NEXT_PUBLIC_R2_BASE_URL` | ya (Fase 2+) | Base URL publik bucket R2 (custom domain atau `pub-xxx.r2.dev`), dipakai membentuk URL gambar. |
| `META_APP_ID` / `META_APP_SECRET` | ya (Fase 4+) | Kredensial Meta Developer App untuk Graph API. |
| `META_API_VERSION` | ya (Fase 4+) | Versi Graph API yang dikunci, mis. `v26.0`. |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | opsional | Notifikasi kegagalan job lewat Telegram. |
| `NOTIFY_EMAIL_TO` / `NOTIFY_EMAIL_FROM` / `RESEND_API_KEY` | opsional | Notifikasi kegagalan job lewat email (Resend). |

`.env` tidak pernah masuk git (lihat `.gitignore`). Jangan commit token apa pun — lihat `agents.md` aturan #5.

## Perintah

```bash
pnpm dev                    # localhost:3000
pnpm build
pnpm typecheck               # wajib bersih sebelum commit
pnpm lint
pnpm test                    # vitest
pnpm db:generate             # buat migration dari perubahan skema
pnpm db:migrate              # terapkan migration
pnpm db:studio               # buka Drizzle Studio

pnpm cli user:create <username>                  # buat akun, prompt password interaktif
pnpm cli render:preview <template> --out ./tmp   # render template ke JPEG lokal
pnpm cli publish:dry-run <post-id>               # jalankan alur publish tanpa memanggil Meta
```

CI (`.github/workflows/ci.yml`) menjalankan lint, typecheck, dan test pada tiap push/PR ke `main`.
