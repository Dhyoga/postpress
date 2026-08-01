import { listActiveAccounts, updateIgAccount } from "@/lib/db/queries";
import { encryptToken, decryptToken } from "./token-crypto";
import { notifyJobFailure } from "@/lib/jobs/notify";

const ALERT_WINDOW_DAYS = 14;
const DEFAULT_API_VERSION = "v26.0";

function daysUntil(date: Date): number {
  return Math.floor((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

/** design.md §8.5 — System User token tidak kedaluwarsa (token_expires_at null,
 * tidak butuh refresh). Long-lived user token berlaku 60 hari dan bisa
 * di-refresh lewat endpoint ini setelah dipakai minimal 24 jam. */
async function exchangeForLongLivedToken(currentToken: string): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) throw new Error("META_APP_ID/META_APP_SECRET belum diset di environment");

  const apiVersion = process.env.META_API_VERSION ?? DEFAULT_API_VERSION;
  const url = new URL(`https://graph.facebook.com/${apiVersion}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", currentToken);

  const res = await fetch(url.toString());
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: { message?: string } };
  if (!res.ok || !body.access_token) {
    throw new Error(body.error?.message ?? `Gagal refresh token (HTTP ${res.status})`);
  }
  return { accessToken: body.access_token, expiresInSeconds: body.expires_in ?? 60 * 24 * 60 * 60 };
}

export interface TokenRefreshResult {
  accountId: string;
  handle: string;
  action: "system_user" | "refreshed" | "alerted" | "ok" | "failed";
  daysLeft?: number;
  error?: string;
}

/** `token:refresh` (design.md §8.5 & §10, harian 03:00) — untuk tiap akun
 * aktif: token tanpa `token_expires_at` dianggap System User token (tidak
 * pernah kedaluwarsa, tidak disentuh). Token dengan expiry dicoba di-refresh;
 * kalau refresh gagal dan sisa waktu di bawah 14 hari, kirim notifikasi
 * supaya operator sambung ulang akun secara manual sebelum publikasi berhenti
 * tanpa suara. */
export async function runTokenRefresh(): Promise<TokenRefreshResult[]> {
  const accounts = await listActiveAccounts();
  const results: TokenRefreshResult[] = [];

  for (const account of accounts) {
    if (!account.tokenExpiresAt) {
      results.push({ accountId: account.id, handle: account.handle, action: "system_user" });
      continue;
    }

    const daysLeft = daysUntil(account.tokenExpiresAt);
    try {
      const current = decryptToken(account.tokenEncrypted);
      const refreshed = await exchangeForLongLivedToken(current);
      await updateIgAccount(account.id, {
        tokenEncrypted: encryptToken(refreshed.accessToken),
        tokenExpiresAt: new Date(Date.now() + refreshed.expiresInSeconds * 1000),
      });
      results.push({ accountId: account.id, handle: account.handle, action: "refreshed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal refresh token";
      if (daysLeft < ALERT_WINDOW_DAYS) {
        await notifyJobFailure(
          "token:refresh",
          `Token akun @${account.handle} gagal di-refresh dan kedaluwarsa dalam ${daysLeft} hari (${message}). Sambungkan ulang akun secara manual.`,
        );
        results.push({ accountId: account.id, handle: account.handle, action: "alerted", daysLeft, error: message });
      } else {
        results.push({ accountId: account.id, handle: account.handle, action: "failed", daysLeft, error: message });
      }
    }
  }

  return results;
}
