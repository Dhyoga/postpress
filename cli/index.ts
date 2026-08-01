import "./lib/load-env";
import { userCreate } from "./commands/user-create";
import { renderPreview } from "./commands/render-preview";
import { publishDryRun } from "./commands/publish-dry-run";

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
