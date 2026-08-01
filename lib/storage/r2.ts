import { PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} belum diset di environment`);
  return value;
}

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;
  const accountId = getEnv("R2_ACCOUNT_ID");
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

/** Upload JPEG ke R2 dan kembalikan URL publik. Instagram Graph API mensyaratkan
 * `image_url` yang bisa dijangkau server Meta (bukan `localhost` atau URL bertanda
 * tangan berumur pendek) — lihat design.md §8.4, jadi URL yang dikembalikan harus
 * lewat domain publik bucket (`NEXT_PUBLIC_R2_BASE_URL`), bukan endpoint R2 privat. */
export async function uploadSlideJpeg(key: string, body: Buffer): Promise<string> {
  const bucket = getEnv("R2_BUCKET");
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  const base = getEnv("NEXT_PUBLIC_R2_BASE_URL").replace(/\/+$/, "");
  return `${base}/${key}`;
}

export async function deleteSlideJpeg(key: string): Promise<void> {
  const bucket = getEnv("R2_BUCKET");
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/** Upload generik (dipakai backup database, Fase 6) — beda dari
 * `uploadSlideJpeg` karena tidak mengembalikan URL publik. Bucket R2 di
 * proyek ini publik-baca lewat `NEXT_PUBLIC_R2_BASE_URL` untuk keperluan
 * JPEG slide (disyaratkan Instagram Graph API), jadi backup yang naik ke
 * bucket yang sama ikut bisa diakses lewat URL itu kalau tahu key-nya —
 * lihat catatan di `docs/operator-runbook.md` soal memisahkan bucket privat
 * untuk backup di produksi. */
export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<string> {
  const bucket = getEnv("R2_BUCKET");
  await getClient().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
  return key;
}

export function slideObjectKey(postId: string, position: number): string {
  return `posts/${postId}/slide-${String(position).padStart(2, "0")}.jpg`;
}
