import { existsSync } from "node:fs";

// `next dev`/`next build` memuat `.env` otomatis lewat dotenv bawaan Next.js;
// CLI ini jalan di luar Next, jadi muat manual di sini. Modul ini HARUS jadi
// import pertama di cli/index.ts: deklarasi `import` di ES module dievaluasi
// sebelum kode level-atas modul manapun dijalankan, termasuk yang berada di
// atasnya secara tekstual — kalau .env dimuat setelah `./commands/*` diimpor,
// lib/db/index.ts sudah lebih dulu membaca `process.env.DATABASE_URL` (kosong)
// saat membuat koneksi postgres, dan itu manifestasinya jadi query error yang
// membingungkan, bukan error env yang jelas.
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL tidak ditemukan. Pastikan file .env di root proyek berisi DATABASE_URL sebelum menjalankan `pnpm cli`.",
  );
  process.exit(1);
}
