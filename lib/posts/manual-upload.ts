import sharp from "sharp";

/** Batas Instagram Graph API untuk carousel (`children`) — di bawah 2 gambar
 * bukan carousel (jadi single post), di atas 10 ditolak Meta. */
export const MIN_CAROUSEL_IMAGES = 2;
export const MAX_IMAGES = 10;

/** 10 MB per file — dicek SEBELUM decode `sharp` supaya file raksasa tidak
 * membuang CPU buat didekode dulu baru ditolak. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Rasio aspek yang diterima Instagram untuk feed/carousel (4:5 sampai 1.91:1),
 * sesuai dokumentasi Graph API — bukan angka yang dikarang. */
export const MIN_ASPECT_RATIO = 0.8;
export const MAX_ASPECT_RATIO = 1.91;

const JPEG_QUALITY = 90;

export class ManualUploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManualUploadValidationError";
  }
}

/**
 * Validasi satu file gambar upload manual dan kembalikan JPEG yang sudah
 * dinormalisasi (kualitas sama dengan lib/render/render.ts#svgToJpeg, supaya
 * konsisten dengan slide hasil Satori). Melempar ManualUploadValidationError
 * dengan pesan yang bisa ditindaklanjuti pengguna kalau gagal — jangan pernah
 * menyisipkan file yang gagal validasi ke DB/R2 (lihat design.md §Risks).
 */
export async function validateAndNormalizeImage(label: string, buffer: Buffer): Promise<Buffer> {
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new ManualUploadValidationError(
      `${label} berukuran lebih dari ${MAX_IMAGE_BYTES / (1024 * 1024)} MB. Kompres dulu gambarnya sebelum upload.`,
    );
  }

  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    throw new ManualUploadValidationError(`${label} bukan file gambar yang bisa dibaca. Pastikan formatnya JPEG, PNG, atau WEBP.`);
  }

  const { width, height } = metadata;
  if (!width || !height) {
    throw new ManualUploadValidationError(`${label} bukan file gambar yang bisa dibaca. Pastikan formatnya JPEG, PNG, atau WEBP.`);
  }

  const ratio = width / height;
  if (ratio < MIN_ASPECT_RATIO || ratio > MAX_ASPECT_RATIO) {
    throw new ManualUploadValidationError(
      `${label} punya rasio ${width}:${height} yang di luar batas Instagram (4:5 sampai 1.91:1). Pakai foto dengan rasio lain.`,
    );
  }

  return sharp(buffer).jpeg({ quality: JPEG_QUALITY }).toBuffer();
}
