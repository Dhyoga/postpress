# AGENTS.md

Panduan untuk AI coding agent yang bekerja di repo ini. Baca ini sebelum menulis kode.

File ini punya dua bagian:

- **Bagian A** — cara bekerja di repo ini (untuk agent yang menulis kode)
- **Bagian B** — agent LLM yang jalan di dalam produk (planner, copywriter)

Kalau ada konflik antara file ini dan `design.md`, `design.md` menang untuk keputusan arsitektur; file ini menang untuk konvensi kode.

---

# Bagian A — Bekerja di repo ini

## Ringkasan proyek

Postpress: tool internal untuk membuat, meninjau, dan menerbitkan konten Instagram secara semi-otomatis. Next.js + Postgres. Gambar dirender dengan Satori, diterbitkan lewat Instagram Graph API. Detail lengkap di `design.md`.

## Perintah

```bash
pnpm install
pnpm dev                    # localhost:3000
pnpm build
pnpm typecheck              # wajib bersih sebelum commit
pnpm lint
pnpm test                   # vitest
pnpm db:generate            # buat migration dari perubahan skema
pnpm db:migrate
pnpm db:studio

pnpm cli user:create <username>
pnpm cli render:preview <template> --out ./tmp   # render template ke JPEG lokal
pnpm cli publish:dry-run <post-id>               # jalankan alur publish tanpa memanggil Meta
```

## Struktur direktori

```
app/
  (auth)/login/            halaman login
  (app)/dashboard/         dashboard, proof sheet
  api/
    auth/                  login, logout
    posts/                 CRUD, approve, reject, regenerate
    cron/                  endpoint terjadwal, dilindungi CRON_SECRET
lib/
  auth/                    sesi, password, middleware
  db/                      skema drizzle, migration, query
  llm/                     klien, prompt, skema Zod   ← Bagian B
  render/
    templates/             template Satori (satu file per template)
    fonts/                 .ttf / .otf  (JANGAN .woff2)
    registry.ts            daftar template + skema slot
    render.ts              satori → resvg → sharp
  instagram/               klien Graph API, alur container
  storage/                 upload R2
  jobs/                    handler tiap job terjadwal
cli/
```

## Konvensi

- **Styling: Tailwind.** Warna dan font selalu lewat token `tailwind.config` (`bg-ultra`, bukan `bg-[#2B2AE0]`). Pola yang berulang lebih dari sekali (tombol, chip, kartu, modal) diekstrak jadi class lewat `@apply` di `@layer components`, bukan ditulis ulang sebagai string utility panjang tiap kali dipakai — lihat `design.md` §3.1 untuk daftar class yang sudah ada sebelum bikin baru. Elemen sekali pakai boleh utility class langsung di markup.
- TypeScript strict. Tidak ada `any`, tidak ada `@ts-ignore` tanpa komentar alasan di barisnya.
- Data eksternal (LLM, Graph API, form) divalidasi dengan **Zod di batas sistem**. Setelah lolos batas, tipe dipercaya.
- Server Component secara default. `"use client"` hanya kalau butuh state atau event handler.
- Query database hanya di `lib/db/queries/`. Jangan panggil Drizzle langsung dari komponen atau route handler.
- Error yang sampai ke UI harus kalimat yang bisa ditindaklanjuti pengguna, bukan pesan teknis. `error_message` di database ikut aturan yang sama.
- Nama file: `kebab-case.ts`. Komponen React: `PascalCase`.
- Commit: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).

## Aturan khusus yang gampang dilanggar

Empat hal ini sudah pernah bikin rusak. Jangan diulang.

### 1. Template Satori bukan CSS biasa

Satori hanya mendukung subset kecil CSS. Sebelum menulis atau mengubah template:

- Flexbox saja. **Tidak ada** `grid`, `float`, `position: fixed`.
- Elemen dengan lebih dari satu anak **wajib** punya `display: flex` eksplisit.
- Tidak ada CSS custom property, tidak ada `calc()` kompleks, tidak ada stylesheet eksternal.
- Font di-load manual sebagai ArrayBuffer. **`.woff2` tidak didukung** — pakai `.ttf` atau `.otf`.
- Emoji butuh `loadAdditionalAsset`. Selama itu belum ada, emoji dilarang muncul di konten.

**Setelah mengubah template apa pun, jalankan `pnpm cli render:preview` dan lihat JPEG-nya.** Typecheck lolos bukan berarti gambarnya benar.

### 2. Instagram hanya menerima JPEG

Pipeline `satori → resvg (PNG) → sharp (JPEG)` tidak boleh dipotong. Mengirim URL PNG ke `/media` akan langsung ditolak API. Kalau ada langkah baru di pipeline, JPEG tetap harus jadi output terakhir.

### 3. Batas karakter diberlakukan di kode

Satori tidak mengecilkan font otomatis. Teks yang kelebihan akan meluber keluar kanvas dan **tidak ada error apa pun** — baru ketahuan saat lihat gambarnya. Batas karakter tiap slot ada di `lib/render/registry.ts` dan wajib divalidasi Zod sebelum render, bukan cuma dituliskan di prompt.

### 4. Tailwind Play CDN cuma untuk prototipe

File HTML statis di luar app Next.js (kalau ada, mis. untuk pratinjau cepat) boleh pakai Tailwind lewat `cdn.tailwindcss.com`. **Ini tidak boleh ikut ke app Next.js yang sebenarnya** — Tailwind sendiri memperingatkan Play CDN tidak untuk produksi (tidak ada purging, seluruh engine jalan di browser tiap load). Di dalam repo Next.js, Tailwind wajib lewat build step (PostCSS), dikonfigurasi sekali di `tailwind.config` dan `globals.css`.

### 5. Rahasia tidak pernah masuk repo

Token Instagram, kunci API, `SESSION_SECRET` — semua dari environment variable. Token IG di database disimpan terenkripsi. Jangan pernah menulis token ke log, ke pesan error, atau ke response API.

### 6. Import Excel lewat jalur yang sama dengan input manual

Segmentasi dan Kata Kunci di Persona bisa diisi manual atau diimpor dari `.xlsx` (parse pakai SheetJS **di client**, bukan diunggah mentah ke server). Hasil parse wajib dikirim lewat endpoint create/update yang sama dengan form manual — jangan bikin endpoint "bulk import" terpisah yang melewati validasi Zod yang sama. Dua jalur input, satu jalur validasi.

## Testing

- **Wajib unit test:** validator Zod skema LLM, state machine post, alur container carousel (Graph API di-mock).
- **Wajib snapshot:** setiap template dirender ke SVG dan dibandingkan dengan snapshot. Ini yang menangkap layout yang jebol.
- Jangan tulis test yang memanggil LLM atau Graph API sungguhan. Keduanya di-mock.
- Jalankan `pnpm typecheck && pnpm test` sebelum menyatakan pekerjaan selesai.

## Selesai berarti

1. `pnpm typecheck` bersih
2. `pnpm test` hijau
3. Kalau menyentuh template: JPEG hasil render sudah dilihat, teks tidak meluber
4. Kalau menyentuh skema: migration ikut di-commit
5. Kalau menyentuh alur publish: `pnpm cli publish:dry-run` lolos
6. Tidak ada rahasia baru yang ter-commit

## Yang harus ditanyakan dulu, jangan diputuskan sendiri

- Menambah dependensi baru
- Mengubah skema database yang sudah dipakai produksi
- Mengubah alur approval — khususnya menambah jalur yang bisa publish tanpa persetujuan manusia
- Memanggil endpoint Meta yang belum dipakai
- Mengubah kanvas dari 1080×1350

---

# Bagian B — Agent LLM di dalam produk

Dua agent, keduanya jalan di `lib/llm/`. Aturan bersama:

- **Tidak ada agent yang boleh menghasilkan HTML, CSS, atau layout.** Mereka hanya mengisi slot teks pada template yang sudah ada. Alasannya di aturan #1 di atas.
- Output wajib lewat structured output / JSON schema, lalu divalidasi Zod. Gagal validasi → retry sekali → status `failed`.
- Temperature 0.3–0.5. Ini bukan tugas kreatif bebas.
- Semua prompt disimpan sebagai file di `lib/llm/prompts/`, bukan string inline. Perubahan prompt harus terlihat di diff.

## B.1 Planner

**Tugas:** menyusun tema konten untuk periode ke depan.

| | |
|---|---|
| Input | Persona akun (branding, DNA, segmentasi, `persona_keywords` kategori topik sebagai hint), 30 topik terakhir, tanggal periode |
| Output | daftar `{ date, topic, angle, type, template }` |
| Dipanggil | `plan:weekly`, Minggu 05:00 WIB |
| Skema | `lib/llm/schemas/plan.ts` |

Aturannya: tidak boleh mengulang topik yang sudah tayang dalam 60 hari terakhir, dan tiap tema harus memetakan ke `template` yang benar-benar ada di registry — kalau tidak, validasi menolaknya.

## B.2 Copywriter

**Tugas:** mengubah satu tema jadi teks per slide plus caption.

| | |
|---|---|
| Input | satu tema, spesifikasi template (nama slot + batas karakter), `voice_pillars`/`voice_pairs`/aturan bahasa dari Persona |
| Output | `{ slides[], caption, hashtags[] }` |
| Dipanggil | `generate:daily`, 06:00 WIB |
| Skema | `lib/llm/schemas/copy.ts` |

Spesifikasi slot **dibuat dari registry**, bukan ditulis ulang di prompt. Kalau batas karakter berubah di registry, prompt ikut berubah otomatis. Ini mencegah prompt dan validator saling berbohong.

Caption maksimal 2.200 karakter (batas Instagram), hashtag 5–15 buah.

Setelah output kembali, validasi tidak mengandung kata di `persona_keywords` kategori `larangan` — kalau ketemu, retry sekali dengan instruksi eksplisit, baru jatuh ke `failed`. Jangan andalkan prompt saja untuk ini.

## B.3 Yang sengaja tidak diserahkan ke LLM

- Pilihan layout dan styling → template hardcoded
- Waktu posting → aturan tetap di scheduler
- Keputusan terbit → manusia, lewat tombol approve
- Generate gambar → Satori
- Personalisasi per segmen — Persona punya banyak `persona_segments`, tapi v1 tetap satu suara per akun. Menulis draf berbeda per segmen adalah pekerjaan terpisah (lihat `roadmap.md` § Setelah v1), bukan sesuatu yang otomatis begitu Segmentasi diisi.
