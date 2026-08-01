import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  MAX_IMAGE_BYTES,
  ManualUploadValidationError,
  validateAndNormalizeImage,
} from "./manual-upload";

async function makeImage(width: number, height: number, format: "jpeg" | "png" | "webp" = "jpeg"): Promise<Buffer> {
  const img = sharp({
    create: { width, height, channels: 3, background: { r: 100, g: 120, b: 140 } },
  });
  if (format === "jpeg") return img.jpeg().toBuffer();
  if (format === "png") return img.png().toBuffer();
  return img.webp().toBuffer();
}

describe("validateAndNormalizeImage", () => {
  it("accepts a square image (1:1, within 0.8-1.91) and returns a JPEG buffer", async () => {
    const input = await makeImage(1080, 1080, "png");
    const out = await validateAndNormalizeImage("slide-01.png", input);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(1080);
  });

  it("re-encodes PNG input to JPEG", async () => {
    const input = await makeImage(1080, 1350, "png");
    const out = await validateAndNormalizeImage("slide-01.png", input);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
  });

  it("re-encodes WEBP input to JPEG", async () => {
    const input = await makeImage(1080, 1350, "webp");
    const out = await validateAndNormalizeImage("slide-01.webp", input);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
  });

  it("accepts the 4:5 boundary ratio (0.8)", async () => {
    const input = await makeImage(864, 1080);
    await expect(validateAndNormalizeImage("slide-01.jpg", input)).resolves.toBeInstanceOf(Buffer);
  });

  it("accepts the 1.91:1 boundary ratio", async () => {
    const input = await makeImage(1910, 1000);
    await expect(validateAndNormalizeImage("slide-01.jpg", input)).resolves.toBeInstanceOf(Buffer);
  });

  it("rejects an image narrower than 4:5", async () => {
    const input = await makeImage(500, 1080);
    await expect(validateAndNormalizeImage("slide-01.jpg", input)).rejects.toThrow(ManualUploadValidationError);
  });

  it("rejects an image wider than 1.91:1", async () => {
    const input = await makeImage(1080, 400);
    await expect(validateAndNormalizeImage("slide-01.jpg", input)).rejects.toThrow(ManualUploadValidationError);
  });

  it("rejects a file that isn't a decodable image", async () => {
    const input = Buffer.from("not an image");
    await expect(validateAndNormalizeImage("slide-01.jpg", input)).rejects.toThrow(ManualUploadValidationError);
  });

  it("rejects a file over the size limit without attempting to decode it", async () => {
    const input = Buffer.alloc(MAX_IMAGE_BYTES + 1);
    await expect(validateAndNormalizeImage("slide-01.jpg", input)).rejects.toThrow(ManualUploadValidationError);
  });
});
