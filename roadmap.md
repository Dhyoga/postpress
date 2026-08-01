# Roadmap — Postpress

Perkiraan: 6–8 minggu sampai jalan otomatis penuh, dengan asumsi kerja paruh waktu satu orang.

---

## Jalur kritis: mulai App Review di hari pertama

App Review Meta makan **2–4 minggu**, dan bisa ditolak lalu harus diajukan ulang. Ini pekerjaan paling lama di seluruh proyek dan tidak butuh satu baris kode pun untuk dimulai.

Kerjakan di Minggu 0, bersamaan dengan setup repo. Kalau ditunda sampai fitur lain selesai, proyek berhenti menunggu Meta selama sebulan padahal semua kode sudah siap.

```
Minggu   0    1    2    3    4    5    6    7
         │
Meta     ████████████████████░░░░           ← jalur kritis, mulai sekarang
Fase 1   ████████
Fase 2        ████████████
Fase 3                  ████████
Fase 4                       ████████        ← butuh Meta selesai
Fase 5                            ████████
Fase 6                                 ████
```

---

## Fase 0 — Fondasi (Minggu 0)

- [x] Inisialisasi repo, Next.js + TypeScript strict + Drizzle + Postgres
- [x] Setup lint, typecheck, vitest, CI
- [x] File env dan dokumentasinya

**Jalur Meta — kerjakan paralel:**

- [ ] Ubah akun IG jadi Professional (Business atau Creator)
- [ ] Buat Facebook Page, hubungkan ke akun IG
- [ ] Buat Meta Business Account + Developer App
- [ ] Siapkan bahan App Review: screencast alur, deskripsi use case, privacy policy URL
- [ ] **Ajukan `instagram_basic` + `instagram_content_publish`**
- [ ] Buat System User token di Business Manager (tidak kedaluwarsa)

> Bahan App Review paling sering ditolak karena screencast tidak menunjukkan alur lengkap dari login sampai publish. Rekam ulang dengan sabar lebih murah daripada menunggu siklus review kedua.

> **Blocker (agent):** enam item jalur Meta di atas butuh akun Facebook/Instagram asli, verifikasi bisnis, dan interaksi manual di Meta Business Suite/App Review — tidak bisa dikerjakan oleh coding agent tanpa akses ke kredensial dan perangkat verifikasi seseorang. Dibiarkan un-checked dengan sengaja. `META_APP_ID`/`META_APP_SECRET` di `.env` sudah ada untuk pengembangan lokal, tapi izin `instagram_content_publish` tetap harus diajukan manusia lewat App Review. Kode di Fase 4 (`lib/instagram/`) sudah ditulis dan diuji lewat `publish:dry-run` + mock, jadi begitu App Review lolos, publish sungguhan tinggal pasang token akun uji.

---

## Fase 1 — Login, dashboard, & Persona (Minggu 1)

Target: bisa login, lihat dashboard kosong yang jujur, dan Persona akun bisa diisi lengkap sebelum Fase 3 butuh datanya.

- [x] Skema `users` + `sessions`, migration
- [x] `pnpm cli user:create` dengan prompt password interaktif
- [x] Login: bcrypt, cookie sesi, rate limit 5 percobaan/15 menit
- [x] Middleware proteksi `/dashboard/*` dan `/api/*`
- [x] Layout dashboard sesuai `index.html`
- [x] Empty state: dashboard tanpa data mengarahkan ke tindakan, bukan sekadar kosong
- [x] Logout dan pencabutan sesi
- [x] Skema `personas`, `persona_segments`, `persona_keywords`, migration
- [x] CRUD Persona: Branding/DNA/Visual sebagai form, Segmentasi/Kata Kunci sebagai list
- [x] Endpoint create/update yang sama dipakai baik dari form manual maupun hasil parse Excel (lihat `agents.md` aturan #6)
- [x] Import Excel client-side (SheetJS) untuk Segmentasi dan Kata Kunci, plus unduh template

**Selesai kalau:** admin bisa buat akun lewat CLI, orang lain login, sesi bertahan setelah restart server, dan Persona akun terisi lengkap (manual atau Excel) sebelum mulai Fase 3.

> Catatan: semua item di atas kini disokong tabel sungguhan (`users`, `sessions`,
> `personas`, `persona_segments`, `persona_keywords` lewat migration
> `lib/db/migrations/0000_lying_black_tom.sql`) dan diverifikasi end-to-end lewat
> `pnpm cli user:create` + login + `POST/GET /api/persona`, `/api/persona/segments`,
> `/api/persona/keywords` melawan Postgres lokal. `components/dashboard/*`,
> `components/queue/*`, `components/history/*` (Antrean/Riwayat/Hari-ini) masih
> memakai bentuk tipe dari `lib/mock/types.ts` (field `date`/`time`/`slideKinds`)
> alih-alih baris `posts`/`slides` asli — penyesuaian itu masuk lingkup Fase 5
> ("Proof sheet ... tombol setujui/tolak/buat ulang"), bukan Fase 1.

---

## Fase 2 — Render pipeline (Minggu 2–3)

Fase paling berisiko secara teknis. Kerjakan sebelum menyentuh LLM — lebih mudah men-debug layout dengan teks yang kamu tulis sendiri.

- [x] Pasang `satori`, `@resvg/resvg-js`, `sharp`
- [x] Load font `.ttf`/`.otf` sebagai ArrayBuffer (bukan `.woff2`)
- [x] `lib/render/render.ts`: SVG → PNG → JPEG 1080×1350
- [x] Registry template dengan skema slot + batas karakter
- [x] Template `cover`
- [x] Template `point`
- [x] Template `cta`
- [x] `pnpm cli render:preview` untuk lihat hasil tanpa jalankan app
- [x] Snapshot test SVG per template
- [x] Upload ke R2, verifikasi URL publik bisa diakses dari luar jaringan lokal

**Selesai kalau:** perintah CLI menghasilkan 7 JPEG yang layak posting, dan URL-nya bisa dibuka dari HP di jaringan seluler.

> Catatan: `lib/render/fonts/*.ttf` yang ada sebelumnya sebenarnya file WOFF2 yang
> diganti ekstensi (`file` melaporkan "Web Open Font Format 2") — Satori langsung
> gagal baca ("Unsupported OpenType signature wOF2"), persis risiko yang disebut
> agents.md §1. Diganti dengan instance TrueType statis asli per berat
> (`fonttools varLib.instancer` dari font variabel Google Fonts, sumber terbuka
> lisensi OFL yang sama), karena Satori/opentype.js juga gagal parse font variable
> modern langsung (`Cannot read properties of undefined (reading '256')` saat baca
> tabel `glyf`/`gvar`). Template `quote` juga ikut dibuat meski tidak wajib di
> checklist ini (sudah ada di registry & design.md §7.3). Upload R2 diverifikasi
> nyata: render 1 JPEG → upload → `fetch()` URL publik dari sandbox ini (200 OK,
> `image/jpeg`) → objek uji dihapus lagi.

**Risiko:** teks meluber tanpa error. Uji tiap template dengan teks di batas maksimum, bukan teks pendek yang nyaman.

---

## Fase 3 — Lapisan LLM (Minggu 3–4)

- [x] Klien LLM dengan structured output
- [x] Skema Zod: `plan.ts`, `copy.ts`
- [x] Prompt planner dibuat dari Persona (branding, DNA, segmentasi, kata kunci topik) + riwayat topik
- [x] Prompt copywriter dibuat dari registry template + `voice_pillars`/`voice_pairs`/aturan bahasa dari Persona
- [x] Validasi pasca-generate: tolak/retry kalau output memuat kata di `persona_keywords` kategori larangan
- [x] Validasi + retry sekali + jatuh ke `failed`
- [x] Sambungkan: topik → copy → render → JPEG di R2

**Selesai kalau:** satu topik yang diketik manual, dengan Persona yang sudah diisi di Fase 1, menghasilkan carousel utuh dengan caption dan gaya yang konsisten — tanpa sentuhan tangan.

> **Blocker (agent):** `lib/llm/client.ts` memaksa output terstruktur lewat tool-use
> (`tool_choice` dipatok, skema Zod dikonversi ke JSON Schema lewat `z.toJSONSchema`
> bawaan Zod v4 — tanpa dependensi SDK baru), dan seluruh pipeline
> topik → copy → render → upload R2 → `needs_review` sudah tersambung lewat
> `lib/jobs/generate.ts` + `POST /api/posts/[id]/generate` (dipakai tombol "Generate
> sekarang"/"Buat ulang" di UI). Panggilan LLM sungguhan ke `ANTHROPIC_BASE_URL`
> (`agentrouter.org`, sesuai `.env`) diblokir WAF Aliyun dari jaringan sandbox agent
> ini (respons 200 tapi berisi halaman tantangan HTML, bukan JSON) — jalur error
> sudah diuji end-to-end (post berakhir di status `failed` dengan `error_message`
> yang bisa ditindaklanjuti, tanpa token bocor ke log), tapi keluaran LLM
> sungguhan belum bisa diverifikasi dari sini. Manusia dengan akses jaringan
> yang tidak diblokir WAF tinggal coba `POST /api/posts/:id/generate` pada akun
> yang Persona-nya sudah terisi. Semua validator Zod (plan.ts, copy.ts,
> forbidden-words, carousel skeleton) diuji unit test dengan mock, sesuai
> agents.md ("Jangan tulis test yang memanggil LLM ... sungguhan").

---

## Fase 4 — Publikasi (Minggu 4–5) · butuh App Review lolos

- [x] Klien Graph API dengan penanganan error terstruktur
- [x] Alur single post: container → publish
- [x] Alur carousel: children → parent → publish
- [x] Enkripsi token IG di database
- [x] Cek `content_publishing_limit` sebelum publish
- [x] Catat header `X-App-Usage` ke `publish_logs`
- [x] `publish:dry-run` untuk uji tanpa memanggil Meta
- [x] Retry backoff 1/5/25 menit, kecuali error auth (kode 190)
- [ ] Publish pertama ke akun uji

**Selesai kalau:** carousel 7 slide muncul di feed akun uji lewat satu perintah.

> **Blocker (agent):** sama seperti dicatat di Fase 0 — publish sungguhan butuh
> `instagram_content_publish` lolos App Review Meta plus token akun IG uji asli,
> keduanya tidak bisa didapat coding agent. Semua yang bisa dikerjakan lewat kode
> sudah selesai dan diverifikasi nyata: `lib/instagram/client.ts` (container,
> carousel item, carousel parent, publish, `content_publishing_limit`, parsing
> header `X-App-Usage`), `lib/instagram/token-crypto.ts` (AES-256-GCM,
> round-trip diuji), `lib/instagram/retry.ts` (backoff 1/5/25 menit, kode 190
> tidak di-retry), dan `lib/instagram/publish.ts` yang menyambungkan semuanya
> plus mencatat tiap fase ke `publish_logs`. `pnpm cli publish:dry-run <post-id>`
> dijalankan sungguhan melawan Postgres lokal (bukan cuma unit test) — carousel
> 3-slide berhasil lewat container → carousel → publish tanpa memanggil Meta,
> status post berpindah ke `published`, dan `publish_logs` berisi 6 baris (1 cek
> kuota + 3 container + 1 carousel + 1 publish), semua `ok=true`. Alur carousel
> Graph API juga diuji unit test dengan mock (`lib/instagram/publish.test.ts`),
> termasuk urutan slide dipublish berdasarkan `position` (bukan urutan array) dan
> kegagalan kode 190 yang tidak retryable.

---

## Fase 5 — Alur review & otomasi (Minggu 5–6)

- [x] Proof sheet: lihat JPEG hasil render sungguhan, bukan pratinjau HTML
- [x] Tombol setujui, tolak, buat ulang
- [x] Edit caption sebelum terbit
- [x] State machine post beserta sweeper untuk job macet
- [x] Cron `generate:daily` 06:00 WIB
- [x] Cron `publish:hourly`
- [x] Cron `plan:weekly`
- [x] Lock baris (`FOR UPDATE SKIP LOCKED`) supaya tidak ada post ganda
- [x] Notifikasi kalau job gagal (email atau Telegram)

**Selesai kalau:** sistem jalan tujuh hari berturut-turut tanpa intervensi selain klik setujui.

> Catatan: keempat cron (`/api/cron/generate-daily`, `/publish-hourly`,
> `/plan-weekly`, `/sweep-stuck`) dilindungi `CRON_SECRET` (header
> `Authorization: Bearer`) lewat `lib/jobs/cron-auth.ts`, penjadwalan waktu
> sungguhan (systemd timer/Vercel Cron/dst.) belum dipasang — endpoint tinggal
> dipanggil dari penjadwal pilihan. `sweep:stuck` butuh kolom baru
> `posts.updated_at` (migration `0001_many_loners.sql`) karena skema semula
> tidak punya cara tahu SUDAH BERAPA LAMA sebuah post ada di status
> `generating`/`publishing` — `createdAt` cuma menunjukkan kapan baris dibuat.
> Diverifikasi nyata lewat Postgres lokal: sweeper memindahkan post yang
> di-backdate ke `failed`; `publish:hourly` mengklaim post `approved` yang
> jadwalnya lewat lewat `FOR UPDATE SKIP LOCKED`, benar-benar memanggil
> `graph.facebook.com` (bukan diblokir WAF seperti `agentrouter.org` di Fase 3),
> dan menangani respons error asli ("Invalid OAuth access token") dengan benar
> — post berpindah ke `failed` tanpa macet di `publishing`. Perbaikan bug nyata
> ditemukan lewat uji ini: `attemptPublish()` awalnya mendekripsi token IG DI
> LUAR blok try/catch, jadi token rusak/`TOKEN_ENCRYPTION_KEY` salah membuat
> post macet selamanya di status `publishing` alih-alih jatuh ke `failed`.
> `plan:weekly`/`generate:daily` diverifikasi gagal dengan baik saat LLM
> terblokir WAF (lihat blocker Fase 3), tidak menjatuhkan seluruh proses cron.

---

## Fase 6 — Pengerasan (Minggu 6–7)

- [ ] Job refresh token + alert kalau <14 hari lagi kedaluwarsa
- [ ] Halaman riwayat dengan pesan kegagalan yang bisa ditindaklanjuti
- [ ] Backup database terjadwal
- [ ] Pemantauan uptime cron
- [ ] Panduan operator: apa yang harus dilakukan saat post gagal
- [ ] Audit: tidak ada token di log atau pesan error

---

## Setelah v1

Berurutan sesuai nilai terhadap usaha:

1. **Multi-akun** — skema sudah siap, tinggal UI pemilih akun
2. **Insights** — reach dan saves per post, untuk tahu template mana yang jalan
3. **Perpustakaan template** — variasi visual supaya feed tidak monoton
4. **Reels** — butuh alur video, kemungkinan permission tambahan
5. **Balas komentar** — permission dan pertimbangan moderasi berbeda
6. **Personalisasi per segmen** — draf berbeda untuk tiap audiens di Segmentasi, bukan satu suara untuk semua

Sengaja belum: editor template visual, dan generate gambar pakai model AI. Keduanya menambah biaya dan ketidakpastian tanpa memperbaiki masalah utama, yaitu konsistensi posting.

---

## Risiko

| Risiko | Dampak | Penanganan |
|---|---|---|
| App Review ditolak | Proyek berhenti | Ajukan Minggu 0, siapkan bahan dengan teliti, sisakan waktu untuk satu siklus ulang |
| Teks meluber di gambar | Post jelek terbit | Batas karakter divalidasi di kode + snapshot test + review manusia |
| Token kedaluwarsa diam-diam | Publikasi berhenti tanpa suara | System user token + alert 14 hari |
| Kualitas LLM merosot | Konten membosankan | Approval manusia, riwayat topik, template beragam |
| Meta mengubah API | Publikasi rusak | Kunci versi API, klien terisolasi di satu modul |
