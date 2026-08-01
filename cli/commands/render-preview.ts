import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { TEMPLATE_META } from "@/lib/render/registry";
import { renderJpegToFile } from "@/lib/render/render";
import { DEMO_CAROUSEL, MAX_LENGTH_FIXTURES } from "@/lib/render/fixtures";

function parseArgs(args: string[]) {
  const positional = args.filter((a) => !a.startsWith("--"));
  const outIdx = args.indexOf("--out");
  const out = outIdx >= 0 ? args[outIdx + 1] : "./tmp";
  return { template: positional[0], out };
}

export async function renderPreview(args: string[]) {
  const { template, out } = parseArgs(args);
  const templateIds = TEMPLATE_META.map((t) => t.id);

  if (!template) {
    console.error(`Pemakaian: pnpm cli render:preview <${templateIds.join("|")}|carousel> [--out ./tmp]`);
    process.exitCode = 1;
    return;
  }

  await mkdir(out, { recursive: true });

  if (template === "carousel") {
    let i = 1;
    for (const slide of DEMO_CAROUSEL) {
      const outPath = join(out, `slide-${String(i).padStart(2, "0")}-${slide.template}.jpg`);
      await renderJpegToFile(slide.template, slide.content, outPath);
      console.log(`Ditulis: ${outPath}`);
      i += 1;
    }
    console.log(`\n${DEMO_CAROUSEL.length} JPEG carousel contoh berhasil dirender ke ${out}`);
    return;
  }

  if (!templateIds.includes(template)) {
    console.error(`Template tidak dikenal: "${template}". Pilihan: ${templateIds.join(", ")}, carousel`);
    process.exitCode = 1;
    return;
  }

  const content = MAX_LENGTH_FIXTURES[template];
  const outPath = join(out, `${template}.jpg`);
  await renderJpegToFile(template, content, outPath);
  console.log(`Ditulis: ${outPath}`);
}
