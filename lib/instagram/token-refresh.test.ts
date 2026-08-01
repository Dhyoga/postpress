import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  listActiveAccounts: vi.fn(),
  updateIgAccount: vi.fn(),
}));

vi.mock("@/lib/db/queries", () => mocks);
vi.mock("./token-crypto", () => ({
  decryptToken: vi.fn(() => "current-token"),
  encryptToken: vi.fn((t: string) => `enc(${t})`),
}));
vi.mock("@/lib/jobs/notify", () => ({ notifyJobFailure: vi.fn() }));

import { runTokenRefresh } from "./token-refresh";
import { notifyJobFailure } from "@/lib/jobs/notify";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
  process.env.META_APP_ID = "app_id";
  process.env.META_APP_SECRET = "app_secret";
});

describe("runTokenRefresh", () => {
  it("skips accounts with no expiry (System User token)", async () => {
    mocks.listActiveAccounts.mockResolvedValue([{ id: "a1", handle: "brand", tokenEncrypted: "x", tokenExpiresAt: null }]);

    const results = await runTokenRefresh();

    expect(results).toEqual([{ accountId: "a1", handle: "brand", action: "system_user" }]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refreshes a token that's still comfortably valid", async () => {
    const farFuture = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);
    mocks.listActiveAccounts.mockResolvedValue([{ id: "a1", handle: "brand", tokenEncrypted: "x", tokenExpiresAt: farFuture }]);
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ access_token: "new-token", expires_in: 5184000 }), { status: 200 }),
    );

    const results = await runTokenRefresh();

    expect(results).toEqual([{ accountId: "a1", handle: "brand", action: "refreshed" }]);
    expect(mocks.updateIgAccount).toHaveBeenCalledWith("a1", expect.objectContaining({ tokenEncrypted: "enc(new-token)" }));
  });

  it("alerts when refresh fails and fewer than 14 days remain", async () => {
    const soon = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    mocks.listActiveAccounts.mockResolvedValue([{ id: "a1", handle: "brand", tokenEncrypted: "x", tokenExpiresAt: soon }]);
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Invalid token" } }), { status: 400 }),
    );

    const results = await runTokenRefresh();

    expect(results[0].action).toBe("alerted");
    expect(notifyJobFailure).toHaveBeenCalledWith("token:refresh", expect.stringContaining("brand"));
  });

  it("does not alert when refresh fails but expiry is still far away", async () => {
    const farFuture = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);
    mocks.listActiveAccounts.mockResolvedValue([{ id: "a1", handle: "brand", tokenEncrypted: "x", tokenExpiresAt: farFuture }]);
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Temporary error" } }), { status: 500 }),
    );

    const results = await runTokenRefresh();

    expect(results[0].action).toBe("failed");
    expect(notifyJobFailure).not.toHaveBeenCalled();
  });
});
