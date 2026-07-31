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

- [ ] Skema `users` + `sessions`, migration
- [ ] `pnpm cli user:create` dengan prompt password interaktif
- [ ] Login: bcrypt, cookie sesi, rate limit 5 percobaan/15 menit
- [ ] Middleware proteksi `/dashboard/*` dan `/api/*`
- [x] Layout dashboard sesuai `index.html`
- [x] Empty state: dashboard tanpa data mengarahkan ke tindakan, bukan sekadar kosong
- [ ] Logout dan pencabutan sesi
- [ ] Skema `personas`, `persona_segments`, `persona_keywords`, migration
- [ ] CRUD Persona: Branding/DNA/Visual sebagai form, Segmentasi/Kata Kunci sebagai list
- [ ] Endpoint create/update yang sama dipakai baik dari form manual maupun hasil parse Excel (lihat `agents.md` aturan #6)
- [x] Import Excel client-side (SheetJS) untuk Segmentasi dan Kata Kunci, plus unduh template

**Selesai kalau:** admin bisa buat akun lewat CLI, orang lain login, sesi bertahan setelah restart server, dan Persona akun terisi lengkap (manual atau Excel) sebelum mulai Fase 3.

> Catatan: tiga item bercentang di atas baru selesai di sisi UI (slicing `index.html` ke
> Next.js dengan mock data lokal, lihat `lib/mock/`). Form Persona (Branding/DNA/Visual)
> dan CRUD Segmentasi/Kata Kunci sudah jadi komponen React lengkap tapi belum dicentang
> karena datanya masih di state client, bukan tabel `personas`/`persona_segments`/
> `persona_keywords` sungguhan — item itu baru "selesai" setelah Supabase + endpoint
> terpasang.

---

## Fase 2 — Render pipeline (Minggu 2–3)

Fase paling berisiko secara teknis. Kerjakan sebelum menyentuh LLM — lebih mudah men-debug layout dengan teks yang kamu tulis sendiri.

- [ ] Pasang `satori`, `@resvg/resvg-js`, `sharp`
- [ ] Load font `.ttf`/`.otf` sebagai ArrayBuffer (bukan `.woff2`)
- [ ] `lib/render/render.ts`: SVG → PNG → JPEG 1080×1350
- [ ] Registry template dengan skema slot + batas karakter
- [ ] Template `cover`
- [ ] Template `point`
- [ ] Template `cta`
- [ ] `pnpm cli render:preview` untuk lihat hasil tanpa jalankan app
- [ ] Snapshot test SVG per template
- [ ] Upload ke R2, verifikasi URL publik bisa diakses dari luar jaringan lokal

**Selesai kalau:** perintah CLI menghasilkan 7 JPEG yang layak posting, dan URL-nya bisa dibuka dari HP di jaringan seluler.

**Risiko:** teks meluber tanpa error. Uji tiap template dengan teks di batas maksimum, bukan teks pendek yang nyaman.

---

## Fase 3 — Lapisan LLM (Minggu 3–4)

- [ ] Klien LLM dengan structured output
- [ ] Skema Zod: `plan.ts`, `copy.ts`
- [ ] Prompt planner dibuat dari Persona (branding, DNA, segmentasi, kata kunci topik) + riwayat topik
- [ ] Prompt copywriter dibuat dari registry template + `voice_pillars`/`voice_pairs`/aturan bahasa dari Persona
- [ ] Validasi pasca-generate: tolak/retry kalau output memuat kata di `persona_keywords` kategori larangan
- [ ] Validasi + retry sekali + jatuh ke `failed`
- [ ] Sambungkan: topik → copy → render → JPEG di R2

**Selesai kalau:** satu topik yang diketik manual, dengan Persona yang sudah diisi di Fase 1, menghasilkan carousel utuh dengan caption dan gaya yang konsisten — tanpa sentuhan tangan.

---

## Fase 4 — Publikasi (Minggu 4–5) · butuh App Review lolos

- [ ] Klien Graph API dengan penanganan error terstruktur
- [ ] Alur single post: container → publish
- [ ] Alur carousel: children → parent → publish
- [ ] Enkripsi token IG di database
- [ ] Cek `content_publishing_limit` sebelum publish
- [ ] Catat header `X-App-Usage` ke `publish_logs`
- [ ] `publish:dry-run` untuk uji tanpa memanggil Meta
- [ ] Retry backoff 1/5/25 menit, kecuali error auth (kode 190)
- [ ] Publish pertama ke akun uji

**Selesai kalau:** carousel 7 slide muncul di feed akun uji lewat satu perintah.

---

## Fase 5 — Alur review & otomasi (Minggu 5–6)

- [ ] Proof sheet: lihat JPEG hasil render sungguhan, bukan pratinjau HTML
- [ ] Tombol setujui, tolak, buat ulang
- [ ] Edit caption sebelum terbit
- [ ] State machine post beserta sweeper untuk job macet
- [ ] Cron `generate:daily` 06:00 WIB
- [ ] Cron `publish:hourly`
- [ ] Cron `plan:weekly`
- [ ] Lock baris (`FOR UPDATE SKIP LOCKED`) supaya tidak ada post ganda
- [ ] Notifikasi kalau job gagal (email atau Telegram)

**Selesai kalau:** sistem jalan tujuh hari berturut-turut tanpa intervensi selain klik setujui.

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
