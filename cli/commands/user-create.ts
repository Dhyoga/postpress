import { createUserAccount } from "@/lib/auth";
import { getUserByUsername } from "@/lib/db/queries";
import { promptPassword } from "../lib/prompt";

export async function userCreate(args: string[]) {
  const username = args[0];
  if (!username) {
    console.error("Pemakaian: pnpm cli user:create <username>");
    process.exitCode = 1;
    return;
  }

  const existing = await getUserByUsername(username);
  if (existing) {
    console.error(`Username "${username}" sudah dipakai.`);
    process.exitCode = 1;
    return;
  }

  const password = await promptPassword("Password: ");
  if (password.length < 8) {
    console.error("Password minimal 8 karakter.");
    process.exitCode = 1;
    return;
  }
  const confirm = await promptPassword("Ulangi password: ");
  if (password !== confirm) {
    console.error("Password tidak cocok.");
    process.exitCode = 1;
    return;
  }

  const [user] = await createUserAccount(username, password);
  console.log(`User "${user.username}" berhasil dibuat (id: ${user.id}).`);
}
