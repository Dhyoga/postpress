import { existsSync } from "node:fs";
import { userCreate } from "./commands/user-create";
import { renderPreview } from "./commands/render-preview";
import { publishDryRun } from "./commands/publish-dry-run";

// `next dev`/`next build` memuat `.env` otomatis lewat dotenv bawaan Next.js;
// CLI ini jalan di luar Next, jadi muat manual pakai loader bawaan Node
// (stabil sejak Node 20.6) supaya variabel di .env tidak perlu di-export ulang
// tiap jalankan `pnpm cli`. Variabel yang sudah ada di shell env tetap menang
// (loadEnvFile tidak menimpa yang sudah diset).
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const [, , command, ...rest] = process.argv;

const COMMANDS: Record<string, (args: string[]) => Promise<void>> = {
  "user:create": userCreate,
  "render:preview": renderPreview,
  "publish:dry-run": publishDryRun,
};

async function main() {
  const handler = command ? COMMANDS[command] : undefined;
  if (!handler) {
    console.error(`Perintah tidak dikenal: ${command ?? "(kosong)"}`);
    console.error(`Perintah yang tersedia: ${Object.keys(COMMANDS).join(", ")}`);
    process.exitCode = 1;
    return;
  }
  await handler(rest);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit(process.exitCode ?? 0);
  });
