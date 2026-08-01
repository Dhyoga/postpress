import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getPost: vi.fn(),
  getIgAccount: vi.fn(),
  createPublishLog: vi.fn(),
  updatePost: vi.fn(),
}));

vi.mock("@/lib/db/queries", () => mocks);
vi.mock("./token-crypto", () => ({ decryptToken: vi.fn(() => "decrypted-token") }));

import { GraphClient } from "./client";
import { attemptPublish, PublishBlockedError } from "./publish";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "x-app-usage": JSON.stringify({ call_count: 1 }) } });
}

const account = { id: "acc_1", handle: "brand", igUserId: "ig_123", tokenEncrypted: "enc", tokenExpiresAt: null, isActive: true };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getIgAccount.mockResolvedValue(account);
  mocks.createPublishLog.mockResolvedValue([{}]);
  mocks.updatePost.mockResolvedValue([{}]);
});

describe("attemptPublish — carousel", () => {
  const carouselPost = {
    id: "post_1",
    accountId: "acc_1",
    type: "carousel",
    caption: "Caption carousel",
    status: "approved",
    slides: [
      { position: 1, imageUrl: "https://cdn/1.jpg" },
      { position: 3, imageUrl: "https://cdn/3.jpg" },
      { position: 2, imageUrl: "https://cdn/2.jpg" },
    ],
  };

  it("walks children -> parent -> publish in position order and logs every phase", async () => {
    mocks.getPost.mockResolvedValue(carouselPost);
    let call = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      call += 1;
      const url = new URL(String(input));
      if (url.pathname.endsWith("/content_publishing_limit")) {
        return jsonResponse({ data: [{ quota_usage: 1, config: { quota_total: 50, quota_duration: 86400 } }] });
      }
      if (url.pathname.endsWith("/media_publish")) return jsonResponse({ id: "media_final" });
      return jsonResponse({ id: `container_${call}` });
    });
    const client = new GraphClient("token", { fetchImpl: fetchImpl as unknown as typeof fetch });

    const result = await attemptPublish("post_1", 1, { client });

    expect(result).toEqual({ ok: true, retryable: false, mediaId: "media_final" });

    // Children requested in position order (1, 2, 3), not array order (1, 3, 2).
    const childUrls = fetchImpl.mock.calls
      .map((c) => new URL(String(c[0])))
      .filter((u) => u.searchParams.get("is_carousel_item") === "true")
      .map((u) => u.searchParams.get("image_url"));
    expect(childUrls).toEqual(["https://cdn/1.jpg", "https://cdn/2.jpg", "https://cdn/3.jpg"]);

    // content_publishing_limit + 3 children + 1 parent carousel + 1 publish = 6 logged phases.
    expect(mocks.createPublishLog).toHaveBeenCalledTimes(6);
    expect(mocks.createPublishLog.mock.calls.every((c) => c[0].ok === true)).toBe(true);

    expect(mocks.updatePost).toHaveBeenCalledWith("post_1", { status: "publishing" });
    expect(mocks.updatePost).toHaveBeenLastCalledWith(
      "post_1",
      expect.objectContaining({ status: "published", igMediaId: "media_final" }),
    );
  });

  it("marks a 190 auth failure as not retryable and stops the carousel", async () => {
    mocks.getPost.mockResolvedValue(carouselPost);
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/content_publishing_limit")) {
        return jsonResponse({ data: [{ quota_usage: 1, config: { quota_total: 50, quota_duration: 86400 } }] });
      }
      return jsonResponse({ error: { message: "Invalid OAuth access token", code: 190 } }, 400);
    });
    const client = new GraphClient("token", { fetchImpl: fetchImpl as unknown as typeof fetch });

    const result = await attemptPublish("post_1", 1, { client });

    expect(result.ok).toBe(false);
    expect(result.retryable).toBe(false);
    expect(mocks.updatePost).toHaveBeenLastCalledWith(
      "post_1",
      expect.objectContaining({ status: "failed", errorMessage: expect.stringContaining("OAuth") }),
    );
    // At least one logged phase should be the failed child container call.
    expect(mocks.createPublishLog.mock.calls.some((c) => c[0].ok === false)).toBe(true);
  });

  it("treats a quota-exceeded block as retryable", async () => {
    mocks.getPost.mockResolvedValue(carouselPost);
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ data: [{ quota_usage: 50, config: { quota_total: 50, quota_duration: 86400 } }] }),
    );
    const client = new GraphClient("token", { fetchImpl: fetchImpl as unknown as typeof fetch });

    const result = await attemptPublish("post_1", 1, { client });

    expect(result.ok).toBe(false);
    expect(result.retryable).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1); // never got past the quota check
  });
});

describe("attemptPublish — single post", () => {
  const singlePost = {
    id: "post_2",
    accountId: "acc_1",
    type: "single",
    caption: "Caption tunggal",
    status: "approved",
    slides: [{ position: 1, imageUrl: "https://cdn/only.jpg" }],
  };

  it("skips the carousel steps and publishes the one container directly", async () => {
    mocks.getPost.mockResolvedValue(singlePost);
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/content_publishing_limit")) {
        return jsonResponse({ data: [{ quota_usage: 0, config: { quota_total: 50, quota_duration: 86400 } }] });
      }
      if (url.pathname.endsWith("/media_publish")) return jsonResponse({ id: "media_single" });
      return jsonResponse({ id: "container_single" });
    });
    const client = new GraphClient("token", { fetchImpl: fetchImpl as unknown as typeof fetch });

    const result = await attemptPublish("post_2", 1, { client });

    expect(result).toEqual({ ok: true, retryable: false, mediaId: "media_single" });
    // content_publishing_limit + container + publish = 3 phases, never "carousel".
    expect(mocks.createPublishLog).toHaveBeenCalledTimes(3);
    expect(mocks.createPublishLog.mock.calls.some((c) => c[0].phase === "carousel")).toBe(false);
  });
});

describe("attemptPublish — guardrails", () => {
  it("refuses to publish a post that is not approved or failed", async () => {
    mocks.getPost.mockResolvedValue({ id: "post_3", status: "draft", type: "single", slides: [] });
    await expect(attemptPublish("post_3", 1)).rejects.toBeInstanceOf(PublishBlockedError);
    expect(mocks.updatePost).not.toHaveBeenCalled();
  });

  it("refuses to publish a post with no rendered slides", async () => {
    mocks.getPost.mockResolvedValue({ id: "post_4", status: "approved", type: "single", slides: [] });
    await expect(attemptPublish("post_4", 1)).rejects.toBeInstanceOf(PublishBlockedError);
  });
});
