# Panduan operator

Untuk siapa pun yang menjalankan Postpress sehari-hari — bukan untuk agent coding.
Bahasa Indonesia disengaja karena ini dipakai saat sesuatu sudah rusak dan
butuh tindakan cepat.

---

## 1. Kalau ada post gagal (`status = failed`)

1. Buka **Riwayat**, cari post berstatus "Gagal". Pesan di `error_message`
   sudah ditulis untuk manusia (bukan stack trace) — baca dulu sebelum
   menebak-nebak.
2. Tombol **"Coba lagi"** memanggil ulang seluruh pipeline generate (LLM →
   render → upload) dari awal. Aman dipakai berkali-kali (idempoten dari sisi
   data — post lama tidak dobel, cuma diisi ulang).
3. Kalau pesannya menyebutkan kata kunci di bawah, tindakannya beda dari
   "coba lagi" biasa:

| Pesan mengandung... | Artinya | Tindakan |
|---|---|---|
| `Invalid OAuth access token` / kode `190` | Token akun Instagram kedaluwarsa atau dicabut | Sambungkan ulang akun lewat Pengaturan (lihat §3) — "Coba lagi" TIDAK akan membantu sampai token diperbarui |
| `Kuota publish harian akun ini sudah habis` | Rate limit harian Meta kena | Tunggu sampai kuota reset (cek jam di respons `content_publishing_limit`), lalu publish ulang |
| `Persona akun belum diisi` | Post dibuat sebelum Persona lengkap | Lengkapi tab Persona dulu, baru generate ulang |
| `Copy masih memuat kata yang dilarang` | LLM dua kali berturut-turut memakai kata di `persona_keywords` kategori larangan | Cek daftar larangan di Persona, longgarkan kalau terlalu ketat, lalu generate ulang |
| `Proses macet di status ... dihentikan otomatis` | Sweeper (`sweep:stuck`) yang menandai — proses generate/publish sebelumnya mati di tengah jalan | Generate/publish ulang seperti biasa |
| Pesan lain dari Graph API | Baca apa adanya — biasanya sudah cukup jelas (format gambar, URL tidak terjangkau, dsb) | Sesuai isi pesan |

**Jangan** anggap "failed" berarti datanya hilang. Slide dan caption yang
sudah sempat dibuat tetap ada di database sampai di-generate ulang.

---

## 2. Kalau cron berhenti jalan

Enam job cron ada di `app/api/cron/*`, semuanya endpoint HTTP `POST` yang
dilindungi header `Authorization: Bearer $CRON_SECRET`:

| Job | Jadwal disarankan | Endpoint |
|---|---|---|
| `plan:weekly` | Minggu 05:00 WIB | `/api/cron/plan-weekly` |
| `generate:daily` | Tiap hari 06:00 WIB | `/api/cron/generate-daily` |
| `publish:hourly` | Tiap jam | `/api/cron/publish-hourly` |
| `sweep:stuck` | Tiap 15 menit | `/api/cron/sweep-stuck` |
| `token:refresh` | Harian 03:00 | `/api/cron/token-refresh` |
| `backup:database` | Harian (kapan saja, di luar jam sibuk) | `/api/cron/backup-db` |

Proyek ini **tidak** membundel penjadwal cron sendiri (tidak ada systemd
timer/Vercel Cron config di repo) — job-job di atas harus dipanggil dari
penjadwal eksternal pilihan (GitHub Actions schedule, Vercel Cron, cron OS,
dst). Kalau dashboard terasa "diam" (tidak ada post baru, antrean kosong
padahal biasanya ada), curigai dulu apakah penjadwal eksternal itu masih
jalan sebelum menuduh kode aplikasinya rusak.

**Pemantauan uptime:** kalau `CRON_HEARTBEAT_BASE_URL` diisi (lihat
`.env.example`), tiap job mem-ping `"$CRON_HEARTBEAT_BASE_URL/<nama-job>"`
setelah selesai — pasang ke layanan seperti healthchecks.io/Cronitor supaya
dapat alert kalau salah satu job berhenti ping.

**Uji manual satu job** (butuh `CRON_SECRET` dari `.env`):

```bash
curl -X POST https://<domain>/api/cron/sweep-stuck \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## 3. Menyambungkan ulang akun Instagram (token kedaluwarsa)

1. Ambil token baru (System User token dari Business Manager — lihat §11
   `design.md` untuk alasan kenapa ini direkomendasikan alih-alih long-lived
   user token yang kedaluwarsa tiap 60 hari).
2. Enkripsi dan simpan lewat `lib/instagram/token-crypto.ts#encryptToken()` —
   **jangan pernah** menyimpan token mentah ke kolom `token_encrypted`.
   Cara paling aman: jalankan lewat `pnpm cli` atau skrip sekali-pakai lokal,
   bukan lewat form UI (token tidak pernah masuk ke request body dari
   browser — lihat design.md §11.1).
3. Kalau pakai long-lived user token (bukan System User token),
   `token:refresh` (§2) akan mencoba refresh otomatis tiap hari dan mengirim
   notifikasi (Telegram/email, lihat §4) kalau sisa umur token di bawah 14
   hari dan refresh gagal.

---

## 4. Notifikasi kegagalan job

Diatur lewat env var (opsional, isi salah satu atau keduanya):

- Telegram: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`
- Email (lewat Resend): `NOTIFY_EMAIL_TO` + `NOTIFY_EMAIL_FROM` + `RESEND_API_KEY`

Kalau keduanya kosong, job tetap jalan (dan tetap menandai post `failed`
dengan pesan yang jelas) — cuma tidak ada yang di-push aktif ke operator,
jadi satu-satunya cara tahu ada masalah adalah cek dashboard/Riwayat secara
berkala atau pasang pemantauan uptime (§2).

---

## 5. Backup database

`backup:database` (§2) men-dump semua tabel lewat query aplikasi (bukan
`pg_dump`, karena host yang menjalankan cron biasanya tidak punya akses
shell ke binary itu) ke satu file JSON, diunggah ke R2 di
`backups/<tanggal>/postpress-<timestamp>.json`.

**Catatan penting:** bucket R2 proyek ini publik-baca lewat
`NEXT_PUBLIC_R2_BASE_URL` (dipakai untuk menyajikan JPEG slide ke Instagram).
Backup yang diunggah ke bucket yang sama ikut publik-baca kalau seseorang
menebak key-nya. Untuk produksi, pisahkan backup ke bucket R2 privat sendiri
(env var baru, di luar `R2_BUCKET`) sebelum mengandalkan ini untuk data
sensitif. `ig_accounts.token_encrypted` di dalam dump tetap terenkripsi
(bukan plaintext) apa pun kondisi bucket-nya.

**Restore:** ambil file JSON dari R2, tulis skrip sekali-pakai yang
`INSERT`/`UPSERT` tiap tabel dari isi JSON-nya lewat query di
`lib/db/queries.ts` atau Drizzle langsung — belum ada skrip restore otomatis
per Fase 6 roadmap.md (sengaja belum, karena restore penuh perlu keputusan
manual soal urutan/konflik ID, bukan sesuatu yang aman dijalankan otomatis
oleh cron).

---

## 6. Rahasia — jangan pernah muncul di sini

Sesuai `agents.md` aturan #5: token Instagram, `META_APP_SECRET`,
`ANTHROPIC_AUTH_TOKEN`, `CRON_SECRET`, `TOKEN_ENCRYPTION_KEY` tidak boleh
tampil di log, pesan error yang sampai ke UI, atau response API mana pun.
Kalau menemukan salah satu itu di log/error saat debugging, itu bug yang
harus diperbaiki di kode yang menghasilkannya, bukan cuma dihapus dari log
sekali itu saja.
