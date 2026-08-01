import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SlideContent } from "./types";
import { CANVAS, FONTS } from "./theme";
import { getTemplate, validateSlideContent } from "./registry";

const FONT_DIR = join(process.cwd(), "lib/render/fonts");

/** Baca file font sebagai ArrayBuffer murni (bukan Node Buffer) — Satori menerima
 * keduanya, tapi roadmap Fase 2 memang minta ArrayBuffer eksplisit, dan ini juga
 * menghindari isu Buffer yang berbagi `.buffer` dengan pool alokasi Node lain. */
async function loadFontArrayBuffer(filename: string): Promise<ArrayBuffer> {
  const buffer = await readFile(join(FONT_DIR, filename));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

let fontsPromise: ReturnType<typeof loadFonts> | null = null;

/** Satu file per (family, weight) — bukan satu file variable font didaftarkan
 * ulang di beberapa weight. Satori/opentype.js gagal parse font variable modern
 * ("Cannot read properties of undefined (reading '256')" saat baca tabel glyf/gvar),
 * jadi tiap weight sudah di-instance jadi TrueType statis lewat
 * `fonttools varLib.instancer` sebelum masuk repo — lihat komentar di tiap nama file. */
async function loadFonts() {
  const [display400, display700, body400, body600, mono400] = await Promise.all([
    loadFontArrayBuffer("BricolageGrotesque-400.ttf"),
    loadFontArrayBuffer("BricolageGrotesque-700.ttf"),
    loadFontArrayBuffer("IBMPlexSans-400.ttf"),
    loadFontArrayBuffer("IBMPlexSans-600.ttf"),
    loadFontArrayBuffer("IBMPlexMono-400.ttf"),
  ]);

  return [
    { name: FONTS.display, data: display400, weight: 400 as const, style: "normal" as const },
    { name: FONTS.display, data: display700, weight: 700 as const, style: "normal" as const },
    { name: FONTS.body, data: body400, weight: 400 as const, style: "normal" as const },
    { name: FONTS.body, data: body600, weight: 600 as const, style: "normal" as const },
    { name: FONTS.mono, data: mono400, weight: 400 as const, style: "normal" as const },
  ];
}

function getFonts() {
  if (!fontsPromise) fontsPromise = loadFonts();
  return fontsPromise;
}

export async function renderSvg(templateId: string, content: SlideContent): Promise<string> {
  const template = getTemplate(templateId);
  if (!template) throw new Error(`Template "${templateId}" tidak ada di registry`);

  const safeContent = validateSlideContent(templateId, content);
  const fonts = await getFonts();

  return satori(template.element(safeContent), {
    width: CANVAS.width,
    height: CANVAS.height,
    fonts,
  });
}

export async function svgToJpeg(svg: string, quality = 90): Promise<Buffer> {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: CANVAS.width } });
  const png = resvg.render().asPng();
  return sharp(png).jpeg({ quality }).toBuffer();
}

export async function renderJpeg(templateId: string, content: SlideContent): Promise<Buffer> {
  const svg = await renderSvg(templateId, content);
  return svgToJpeg(svg);
}

export async function renderJpegToFile(templateId: string, content: SlideContent, outPath: string): Promise<string> {
  const jpeg = await renderJpeg(templateId, content);
  const { writeFile } = await import("node:fs/promises");
  await writeFile(outPath, jpeg);
  return outPath;
}
