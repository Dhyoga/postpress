# Design Document — Postpress

Sistem internal untuk membuat, meninjau, dan menerbitkan konten Instagram secara semi-otomatis.

- **Status:** Draft v0.3
- **Terakhir diperbarui:** 31 Juli 2026
- **Pemilik:** —

---

## 1. Ringkasan

Postpress menggantikan alur manual "mikir ide → desain di Canva → tulis caption → upload" dengan pipeline terjadwal:

```
Cron 06:00  →  Content plan (LLM)  →  Copy per slide (LLM)  →  Render (Satori)
                                                                     ↓
Instagram  ←  Publish (Graph API)  ←  Approve (manusia)  ←  Upload JPEG ke storage
```

Manusia tetap ada di tengah alur, di satu titik saja: **approve**. Sisanya otomatis.

### Kenapa ada approval

Full-auto tanpa review punya dua risiko yang tidak sebanding dengan waktu yang dihemat:

1. LLM sesekali menghasilkan klaim faktual yang salah atau nada yang meleset dari brand. Di feed publik, ini permanen.
2. Meta cukup sensitif pada pola publikasi yang terlalu mekanis. Jeda manusia bikin ritme posting lebih alami.

Approval didesain agar makan waktu <60 detik: buka dashboard, lihat proof sheet, klik setujui.

---

## 2. Batasan yang membentuk desain

Tiga batasan eksternal ini menentukan hampir semua keputusan teknis di bawah:

| Batasan | Sumber | Konsekuensi desain |
|---|---|---|
| Satori hanya mendukung subset CSS (flexbox only, no grid/float) | Satori | Layout tidak boleh digenerate LLM. Harus template hardcoded. |
| Instagram hanya menerima **JPEG** via `image_url` publik | Graph API | Butuh object storage + konversi PNG→JPEG. |
| Rasio feed harus 4:5 s/d 1.91:1 | Graph API | Kanvas dikunci di 1080×1350. |

Ditambah satu batasan operasional: **App Review Meta makan 2–4 minggu.** Ini jalur kritis proyek, bukan pekerjaan akhir.

---

## 3. Arsitektur

```
┌─────────────────────────────────────────────────────────┐
│  Next.js (App Router)                                    │
│                                                          │
│  /login          /dashboard        /api/*                │
│  session cookie  proof sheet       route handlers        │
└────────────┬─────────────────────────────┬──────────────┘
             │                             │
     ┌───────▼────────┐          ┌─────────▼─────────┐
     │  Postgres      │          │  Job runner       │
     │  users         │          │  (cron + queue)   │
     │  content_plans │          └─────────┬─────────┘
     │  posts         │                    │
     │  slides        │        ┌───────────┼───────────┐
     │  publish_logs  │        │           │           │
     └────────────────┘   ┌────▼───┐  ┌────▼────┐ ┌───▼─────┐
                          │  LLM   │  │ Satori  │ │ IG      │
                          │  API   │  │ +resvg  │ │ Graph   │
                          └────────┘  │ +sharp  │ │ API     │
                                      └────┬────┘ └─────────┘
                                           │
                                    ┌──────▼──────┐
                                    │ Object      │
                                    │ storage     │
                                    │ (R2/S3)     │
                                    └─────────────┘
```

### Stack

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 15, App Router | Route handler + cron di satu repo |
| Styling | Tailwind CSS | Lihat §3.1 |
| Database | Postgres (Neon/Supabase) | Relasional, cukup |
| ORM | Drizzle | Migration eksplisit, ringan |
| Auth | Sesi sendiri (bcrypt + cookie) | Tidak ada signup, tidak butuh NextAuth |
| Render | `satori` + `@resvg/resvg-js` + `sharp` | Lihat §7 |
| Storage | Cloudflare R2 | S3-compatible, egress gratis |
| LLM | Claude / GPT via SDK | Structured output |
| Scheduler | Vercel Cron atau systemd timer | Lihat §10 |

### 3.1 Styling — Tailwind

UI dibangun dengan Tailwind. Token desain (warna, tipografi, radius, shadow, animasi) didefinisikan sekali di `tailwind.config` sebagai `theme.extend`, bukan ditulis berulang sebagai nilai mentah di tiap komponen.

```js
theme: {
  extend: {
    colors: { paper: '#EFEEE8', 'paper-hi': '#FBFAF6', ink: '#15171D',
               ultra: '#2B2AE0', magenta: '#D4006E', slate: '#6C707B', rule: '#DAD8D0' },
    fontFamily: { display: ['"Bricolage Grotesque"', 'sans-serif'],
                   body: ['"IBM Plex Sans"', 'sans-serif'],
                   mono: ['"IBM Plex Mono"', 'monospace'] },
  }
}
```

**Pola komponen berulang** (tombol, chip status, kartu, modal, tabel) diekstrak jadi class lewat `@apply` di layer `components`, bukan ditulis sebagai string utility panjang berulang-ulang di JSX/HTML. Ini penting khususnya untuk markup yang digenerate lewat `innerHTML`/`renderToString` di banyak tempat (daftar antrean, kartu template, dsb) — menulis ulang 15 utility class di tiap baris kode generator jauh lebih rapuh daripada satu `class="chip chip--review"`.

```css
@layer components {
  .btn { @apply font-body text-sm font-semibold px-[18px] py-3 rounded transition-colors; }
  .btn--primary { @apply bg-ultra text-white hover:bg-[#1F1EC4]; }
  .chip { @apply font-mono text-xs uppercase tracking-wide rounded px-[9px] py-[5px]; }
  .chip--review { @apply bg-magenta/10 text-magenta; }
}
```

Aturan:

- **Warna dan font selalu lewat token config**, tidak pernah hex mentah di className (`bg-ultra`, bukan `bg-[#2B2AE0]`), supaya rebrand cukup ubah satu file.
- **Spasi/ukuran presisi boleh pakai arbitrary value** (`w-[172px]`, `text-[13.5px]`) kalau memang harus pas dengan rasio kanvas Satori (1080×1350) atau breakpoint tertentu — jangan dipaksakan ke skala default Tailwind kalau hasilnya jadi tidak presisi.
- **Komponen berulang → `@apply` di `@layer components`.** Elemen sekali pakai (layout halaman, grid unik) → utility class langsung di markup.
- Ikuti `prefers-reduced-motion` dengan varian `motion-reduce:animate-none` pada tiap elemen yang beranimasi, bukan mengandalkan override CSS global.

> **Catatan status prototipe:** `index.html` saat ini memakai Tailwind lewat **Play CDN** (`cdn.tailwindcss.com`) supaya bisa jalan sebagai file HTML tunggal tanpa build step — cocok untuk prototipe klik-klik, **tidak untuk produksi** (Tailwind sendiri memberi peringatan ini). Begitu masuk Fase 1 dan pindah ke Next.js, ganti ke Tailwind versi build (PostCSS/`@tailwindcss/postcss`) yang di-compile saat build, bukan diproses di browser.

---

## 4. Model data

```sql
users (
  id            uuid pk,
  username      text unique not null,
  password_hash text not null,        -- bcrypt, cost 12
  role          text not null,        -- 'admin' | 'editor'
  created_at    timestamptz,
  last_login_at timestamptz
)

sessions (
  id         uuid pk,
  user_id    uuid fk -> users,
  expires_at timestamptz not null,
  user_agent text
)

ig_accounts (
  id              uuid pk,
  handle          text not null,        -- @kelasfreelance.id
  ig_user_id      text not null,        -- IG Business Account ID
  token_encrypted text not null,        -- system user token, AES-GCM
  token_expires_at timestamptz,         -- null kalau system user token
  is_active       boolean default true
)

content_plans (
  id           uuid pk,
  account_id   uuid fk -> ig_accounts,
  period_start date not null,
  period_end   date not null,
  themes       jsonb not null,          -- output LLM planner
  created_by   uuid fk -> users,        -- null kalau dari cron
  created_at   timestamptz
)

posts (
  id             uuid pk,
  account_id     uuid fk -> ig_accounts,
  plan_id        uuid fk -> content_plans null,
  type           text not null,         -- 'single' | 'carousel'
  template       text not null,         -- 'cover_list' | 'quote' | ...
  topic          text not null,
  caption        text,
  hashtags       text[],
  status         text not null,         -- lihat state machine §5
  scheduled_for  timestamptz,
  published_at   timestamptz,
  ig_media_id    text,
  error_message  text,
  created_at     timestamptz
)

slides (
  id         uuid pk,
  post_id    uuid fk -> posts on delete cascade,
  position   int not null,              -- 1-indexed
  kind       text not null,             -- 'cover' | 'point' | 'cta'
  content    jsonb not null,            -- slot values, lihat §6
  image_url  text,                      -- URL publik JPEG
  unique (post_id, position)
)

publish_logs (
  id          uuid pk,
  post_id     uuid fk -> posts,
  attempt     int not null,
  phase       text not null,            -- 'container' | 'carousel' | 'publish'
  request     jsonb,
  response    jsonb,
  ok          boolean,
  created_at  timestamptz
)
```

Catatan: `token_encrypted` dienkripsi di level aplikasi dengan key dari env, bukan disimpan plaintext. Kalau dump database bocor, token IG tidak ikut bocor.

### 4.1 Persona

Satu sumber kebenaran untuk gaya, target, dan batasan visual — menggantikan kolom `ig_accounts.brand_voice` yang tadinya cuma teks bebas. Satu Persona per akun IG (1:1), supaya siap kalau nanti multi-akun (§12) jalan — tiap akun bisa punya suara berbeda.

```sql
personas (
  id                     uuid pk,
  account_id             uuid fk -> ig_accounts unique,
  brand_name             text,
  tagline                text,
  positioning            text,
  dos                    text,
  donts                  text,
  content_mix            jsonb,       -- { edukasi, studiKasus, promosi, hiburan } persen
  post_frequency         int,         -- target post per minggu
  voice_pillars          jsonb,       -- string[], mis. ["Santai","Blak-blakan"]
  voice_pairs            jsonb,       -- { do, dont }[] — contoh berpasangan, jadi few-shot di prompt
  core_values            text,
  sapaan                 text,        -- 'kamu' | 'anda' | 'campur'
  istilah_asing          text,        -- 'pertahankan' | 'indonesia' | 'campur'
  format_tanggal_contoh  text,
  format_angka_contoh    text,
  gaya_judul             text,        -- 'sentence' | 'title'
  colors                 jsonb,       -- { primary, secondary, accent, background, text }
  fonts                  jsonb,       -- { display, body, mono }
  visual_larangan        text,
  updated_at             timestamptz,
  updated_by             uuid fk -> users
)

persona_segments (
  id           uuid pk,
  persona_id   uuid fk -> personas on delete cascade,
  name         text not null,
  tier         text,                  -- 'Utama' | 'Sekunder'
  description  text,
  pain_point   text,
  need         text
)

persona_keywords (
  id           uuid pk,
  persona_id   uuid fk -> personas on delete cascade,
  category     text not null,         -- 'topik' | 'hashtag' | 'larangan' | 'cta'
  value        text not null,
  unique (persona_id, category, value)
)
```

**Import Excel** (Segmentasi, Kata Kunci) diproses murni di browser (SheetJS), bukan lewat endpoint upload khusus. File dibaca dan divalidasi kolomnya di client, lalu tiap baris valid dikirim lewat endpoint create yang sama dengan input manual — satu jalur validasi untuk dua cara input, bukan dua jalur yang bisa saling tidak sinkron.

---

## 5. State machine post

```
  draft ──generate──> generating ──ok──> needs_review ──approve──> approved
                           │                   │                       │
                           │                   └──reject──> rejected    │
                           │                                            │
                           └──error──> failed <──error── publishing <───┘
                                          │                    │
                                          └──retry──┐          ok
                                                    │          ↓
                                                    └──────> published
```

Aturan:

- `generating` dan `publishing` adalah state transisi. Kalau job mati di tengah, ada sweeper yang menandai `failed` setelah 10 menit.
- Hanya `approved` yang boleh diambil publisher. Ini satu-satunya gerbang.
- `failed` menyimpan `error_message` yang bisa dibaca operator, bukan stack trace.

---

## 6. Kontrak LLM

**Prinsip: LLM tidak pernah menghasilkan HTML, CSS, atau layout.** LLM hanya mengisi slot teks pada template yang sudah ada. Alasannya di §2 — Satori akan pecah kalau diberi CSS sembarangan, dan kita tidak punya cara memvalidasi CSS yang digenerate.

### 6.1 Planner

Input: `personas` milik akun (branding, DNA, segmentasi, `persona_keywords` kategori topik sebagai hint — bukan daftar wajib), riwayat 30 topik terakhir, periode.
Output:

```json
{
  "themes": [
    {
      "date": "2026-08-01",
      "topic": "Cara menghitung rate per jam",
      "angle": "Rumus sederhana + contoh angka nyata",
      "type": "carousel",
      "template": "cover_list"
    }
  ]
}
```

### 6.2 Copywriter

Input: satu tema dari planner, spesifikasi template (nama slot + batas karakter), dan bagian relevan dari Persona:

- `voice_pillars` + `voice_pairs` sebagai contoh berpasangan (few-shot), bukan cuma daftar kata sifat
- `sapaan`, `istilah_asing`, `format_tanggal_contoh`, `format_angka_contoh`, `gaya_judul` sebagai aturan mekanik penulisan
- `persona_keywords` kategori `larangan` sebagai kata yang harus dihindari
- `persona_keywords` kategori `cta` sebagai bank pilihan ajakan bertindak untuk slide CTA

Output:

```json
{
  "slides": [
    { "kind": "cover", "eyebrow": "PANDUAN", "title": "5 kesalahan freelancer pemula", "subtitle": "Yang bikin kamu kerja keras tapi tetap kere" },
    { "kind": "point", "index": "01", "heading": "Pasang harga dari rasa takut", "body": "Kamu banting harga karena takut ditolak..." }
  ],
  "caption": "...",
  "hashtags": ["freelanceindonesia", "..."]
}
```

### 6.3 Aturan wajib

1. Pakai **structured output / JSON schema**, bukan "tolong balas JSON saja".
2. Validasi hasil dengan **Zod** sebelum masuk database. Gagal validasi = retry sekali, lalu `failed`.
3. **Batas karakter per slot diberlakukan di kode**, bukan cuma di prompt. Satori tidak auto-shrink font; teks kepanjangan akan meluber keluar kanvas dan baru ketahuan setelah jadi gambar.
4. Suhu rendah (0.3–0.5). Ini bukan tugas kreatif bebas.
5. Kirim daftar topik terakhir supaya tidak mengulang bahasan yang sama tiap dua minggu.
6. Kata di `persona_keywords` kategori `larangan` divalidasi **setelah** output kembali, bukan cuma diserahkan ke kepatuhan prompt. Kalau ketemu, retry sekali dengan instruksi eksplisit menghindari kata itu, lalu `failed` kalau masih muncul.

---

## 7. Render pipeline

```
Template React element  →  satori()  →  SVG string
                                            ↓
                                      Resvg.render()  →  PNG buffer
                                            ↓
                                   sharp().jpeg({ quality: 90 })
                                            ↓
                                    Upload R2  →  URL publik
```

### 7.1 Batasan Satori yang harus dipatuhi template

- **Flexbox saja.** Tidak ada `grid`, `float`, `position: fixed`. `position: absolute` didukung.
- Semua elemen dengan >1 anak **wajib** punya `display: flex` eksplisit.
- **Font harus di-load manual** sebagai ArrayBuffer. Format `.ttf` / `.otf` / `.woff` — **`.woff2` tidak didukung.** Tidak ada fallback font sistem.
- Emoji butuh handler `loadAdditionalAsset` sendiri. Kalau tidak dipakai, larang emoji di prompt LLM.
- Gambar harus base64 atau URL absolut yang bisa di-fetch server.
- Tidak ada CSS eksternal, tidak ada `calc()` kompleks, tidak ada custom property.

### 7.2 Kanvas

- Ukuran: **1080 × 1350** (rasio 4:5). Ini rasio feed paling tinggi yang diizinkan, jadi memakan ruang layar paling banyak.
- Safe area: padding 72px di semua sisi. Instagram memotong preview grid ke 1:1, jadi elemen penting jangan di 168px atas/bawah.
- Carousel: 2–10 slide. Semua slide ukuran identik.

### 7.3 Template

Setiap template adalah fungsi TypeScript murni: `(content: SlideContent) => ReactElement`. Didaftarkan di registry dengan skema slot-nya.

| Template | Slot | Batas karakter |
|---|---|---|
| `cover` | eyebrow, title, subtitle | 20 / 60 / 90 |
| `point` | index, heading, body | 2 / 45 / 160 |
| `quote` | quote, attribution | 140 / 40 |
| `cta` | headline, handle | 50 / 30 |

Skema ini adalah satu sumber kebenaran: dipakai untuk generate prompt, validasi Zod, dan render.

### 7.4 Preview

Dashboard menampilkan JPEG hasil render sungguhan, bukan pratinjau HTML. Pratinjau HTML akan berbohong — CSS browser jauh lebih permisif dari Satori, jadi teks yang meluber di hasil akhir bisa terlihat rapi di preview.

---

## 8. Publikasi ke Instagram

### 8.1 Prasyarat

Semua harus beres sebelum satu baris kode publisher ditulis:

- Akun Instagram **Professional** (Business atau Creator)
- Facebook Page yang terhubung ke akun IG tersebut
- Meta Business Account
- Meta Developer App
- Permission `instagram_basic` + `instagram_content_publish` lolos **App Review**

### 8.2 Alur single post

```
POST /{ig-user-id}/media
  ?image_url={url}&caption={caption}
  → { id: container_id }

POST /{ig-user-id}/media_publish
  ?creation_id={container_id}
  → { id: media_id }
```

### 8.3 Alur carousel

```
1. Untuk tiap slide:
   POST /{ig-user-id}/media
     ?image_url={url}&is_carousel_item=true
   → children_ids[]

2. POST /{ig-user-id}/media
     ?media_type=CAROUSEL
     &children={children_ids.join(',')}
     &caption={caption}
   → parent_container_id

3. POST /{ig-user-id}/media_publish
     ?creation_id={parent_container_id}
```

### 8.4 Hal yang bikin gagal

- **Format:** JPEG saja. PNG, WebP, GIF ditolak. Ini alasan `sharp` ada di pipeline.
- **URL:** harus publik dan bisa dijangkau server Meta. `localhost` dan signed URL berumur pendek tidak jalan.
- **Container kedaluwarsa** setelah 24 jam kalau belum di-publish.
- **Caption:** hashtag `#` harus URL-encoded jadi `%23`.
- **Kuota harian:** ada batas jumlah post per 24 jam per akun, dan angka yang beredar di internet tidak konsisten (25 / 50 / 100 tergantung sumber dan versi API). Jangan percaya artikel blog — baca langsung dari `GET /{ig-user-id}/content_publishing_limit` sebelum publish. Untuk 1 post/hari ini tidak akan pernah jadi masalah, tapi cek tetap murah.
- **Rate limit umum:** sekitar 200 request/jam per akun. Response membawa header `X-App-Usage` dan `X-Business-Use-Case-Usage` — dicatat ke `publish_logs`.

### 8.5 Token

Penyebab kegagalan produksi nomor satu adalah token kedaluwarsa.

- Long-lived user token: berlaku 60 hari, bisa di-refresh setelah 24 jam sejak diterbitkan.
- **Rekomendasi: pakai System User token** dari Business Manager. Tidak kedaluwarsa, jadi tidak ada job refresh yang bisa diam-diam mati.
- Kalau tetap pakai long-lived token: job refresh tiap 50 hari, plus alert kalau `token_expires_at` kurang dari 14 hari lagi.

### 8.6 Retry

Exponential backoff, maksimal 3 percobaan: 1 menit, 5 menit, 25 menit. Setelah itu `failed` dan kirim notifikasi. Error autentikasi (kode 190) **tidak** di-retry — percuma, dan bisa memperburuk status akun.

---

## 9. Auth

Sengaja dibuat minimal karena akun dibuat admin lewat CLI. Tidak ada signup, tidak ada verifikasi email, tidak ada reset password sendiri.

- Password: bcrypt cost 12.
- Sesi: cookie `httpOnly`, `secure`, `sameSite=lax`, umur 7 hari, disimpan di tabel `sessions` supaya bisa dicabut.
- Rate limit login: 5 percobaan per username per 15 menit.
- Endpoint cron dilindungi header rahasia (`CRON_SECRET`), bukan sesi.
- Middleware melindungi `/dashboard/*` dan `/api/*` kecuali `/api/auth/login`.

Membuat user: `pnpm cli user:create <username>` — prompt password interaktif, tidak lewat argumen shell (biar tidak masuk shell history).

---

## 10. Penjadwalan

| Job | Jadwal | Tugas |
|---|---|---|
| `plan:weekly` | Minggu 05:00 WIB | Generate content plan 7 hari ke depan |
| `generate:daily` | Setiap hari 06:00 WIB | Ambil tema hari besok, generate copy + render, status → `needs_review` |
| `publish:hourly` | Tiap jam | Ambil post `approved` yang `scheduled_for <= now()`, publish |
| `token:refresh` | Harian 03:00 | Refresh token kalau <14 hari lagi kedaluwarsa |
| `sweep:stuck` | Tiap 15 menit | Tandai job yang macet di `generating`/`publishing` >10 menit sebagai `failed` |

Semua job harus **idempoten** dan mengambil lock baris (`SELECT ... FOR UPDATE SKIP LOCKED`) supaya eksekusi ganda tidak menghasilkan post ganda.

Timezone disimpan UTC di database, ditampilkan WIB di UI.

---

## 11. Konfigurasi

```bash
DATABASE_URL=
SESSION_SECRET=            # 32 byte random
TOKEN_ENCRYPTION_KEY=      # 32 byte, untuk AES-GCM token IG
CRON_SECRET=

ANTHROPIC_API_KEY=
LLM_MODEL=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=        # domain publik bucket

META_APP_ID=
META_APP_SECRET=
```

Satori **tidak butuh key apa pun.** Dia library rendering lokal, bukan layanan.

### 11.1 Apa yang masuk UI, apa yang masuk env var

Aturan pembeda: **kalau nilainya berubah harian/mingguan → UI. Kalau nilainya kredensial yang jarang disentuh → env var atau CLI.** Menaruh kredensial di form UI memperbesar permukaan kebocoran (screenshot, log, dump database) tanpa manfaat yang sepadan.

| Data | Tempat | Kenapa |
|---|---|---|
| Branding, DNA, segmentasi, visual, kata kunci | Persona (UI) | Sering direvisi, bukan rahasia |
| Jadwal cron, kanal notifikasi | Pengaturan (UI) | Sering disesuaikan |
| Status koneksi & sambung ulang akun IG | Pengaturan (UI) | Perlu dicek manual — tapi token-nya sendiri tidak pernah ditampilkan balik |
| Daftar pengguna & cabut sesi | Pengaturan (UI) | Operasional harian |
| `ANTHROPIC_API_KEY`, `META_APP_SECRET`, token IG mentah | env var / terenkripsi di DB | Kredensial, bukan konten |
| Membuat user baru | CLI (`pnpm cli user:create`) | Sengaja tidak ada form signup — penggunanya sedikit |

---

## 12. Di luar scope v1

Dicatat supaya tidak diam-diam masuk:

- Reels dan Stories (butuh alur video, permission berbeda)
- Multi-akun IG dalam satu dashboard (skema sudah siap, UI belum)
- Analytics / insights
- Balas komentar dan DM
- Generate gambar dengan AI (Satori cukup; model gambar menambah biaya dan ketidakpastian)
- Editor template visual (template diubah lewat kode)
- Personalisasi otomatis per segmen (draf berbeda untuk tiap audiens di Segmentasi) — v1 satu suara per akun, bukan per audiens
