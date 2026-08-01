import { describe, expect, it, vi } from "vitest";
import { GraphClient } from "./client";
import { GraphApiError } from "./errors";

function jsonResponse(body: unknown, init: { status?: number; appUsage?: object } = {}) {
  const headers = new Headers();
  if (init.appUsage) headers.set("x-app-usage", JSON.stringify(init.appUsage));
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers });
}

describe("GraphClient", () => {
  it("creates a single-post media container with the image URL and caption", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ id: "container_1" }, { appUsage: { call_count: 5 } }));
    const client = new GraphClient("token", { fetchImpl: fetchImpl as unknown as typeof fetch });

    const result = await client.createMediaContainer("ig123", "https://cdn.example/a.jpg", "Halo dunia");

    expect(result.data.id).toBe("container_1");
    expect(result.appUsage?.callCount).toBe(5);
    const calledUrl = new URL(fetchImpl.mock.calls[0][0] as string);
    expect(calledUrl.pathname).toBe("/v26.0/ig123/media");
    expect(calledUrl.searchParams.get("image_url")).toBe("https://cdn.example/a.jpg");
    expect(calledUrl.searchParams.get("caption")).toBe("Halo dunia");
    expect(calledUrl.searchParams.get("access_token")).toBe("token");
  });

  it("marks carousel items with is_carousel_item=true", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ id: "child_1" }));
    const client = new GraphClient("token", { fetchImpl: fetchImpl as unknown as typeof fetch });

    await client.createCarouselItem("ig123", "https://cdn.example/slide-1.jpg");

    const calledUrl = new URL(fetchImpl.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("is_carousel_item")).toBe("true");
  });

  it("joins children ids with commas when creating the parent carousel container", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ id: "parent_1" }));
    const client = new GraphClient("token", { fetchImpl: fetchImpl as unknown as typeof fetch });

    await client.createCarouselContainer("ig123", ["a", "b", "c"], "Caption");

    const calledUrl = new URL(fetchImpl.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("media_type")).toBe("CAROUSEL");
    expect(calledUrl.searchParams.get("children")).toBe("a,b,c");
  });

  it("publishes a container by creation_id", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ id: "media_1" }));
    const client = new GraphClient("token", { fetchImpl: fetchImpl as unknown as typeof fetch });

    const result = await client.publishMedia("ig123", "container_1");

    expect(result.data.id).toBe("media_1");
    const calledUrl = new URL(fetchImpl.mock.calls[0][0] as string);
    expect(calledUrl.pathname).toBe("/v26.0/ig123/media_publish");
    expect(calledUrl.searchParams.get("creation_id")).toBe("container_1");
  });

  it("reads the content publishing limit with GET", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: [{ quota_usage: 3, config: { quota_total: 50, quota_duration: 86400 } }] }));
    const client = new GraphClient("token", { fetchImpl: fetchImpl as unknown as typeof fetch });

    const result = await client.getContentPublishingLimit("ig123");

    expect(result.data.data[0].quota_usage).toBe(3);
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ method: "GET" });
  });

  it("throws a GraphApiError with the code from an error response", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: { message: "Invalid OAuth access token", code: 190, error_subcode: 460 } }, { status: 400 }));
    const client = new GraphClient("token", { fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(client.createMediaContainer("ig123", "https://x/a.jpg")).rejects.toMatchObject({
      code: 190,
      subcode: 460,
      isAuthError: true,
    });
  });

  it("wraps a network failure in a GraphApiError instead of throwing raw", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const client = new GraphClient("token", { fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(client.createMediaContainer("ig123", "https://x/a.jpg")).rejects.toBeInstanceOf(GraphApiError);
  });
});
