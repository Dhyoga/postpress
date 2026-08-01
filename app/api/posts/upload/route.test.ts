import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createPost: vi.fn(),
  deletePost: vi.fn(),
  getOrCreateDefaultAccount: vi.fn(),
  getPost: vi.fn(),
  logPostEvent: vi.fn(),
  replaceSlides: vi.fn(),
  uploadSlideJpeg: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/db/queries", () => ({
  createPost: mocks.createPost,
  deletePost: mocks.deletePost,
  getOrCreateDefaultAccount: mocks.getOrCreateDefaultAccount,
  getPost: mocks.getPost,
  logPostEvent: mocks.logPostEvent,
  replaceSlides: mocks.replaceSlides,
}));
vi.mock("@/lib/storage/r2", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage/r2")>("@/lib/storage/r2");
  return { ...actual, uploadSlideJpeg: mocks.uploadSlideJpeg };
});

import { POST } from "./route";

async function makeImageFile(name: string, width: number, height: number): Promise<File> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .png()
    .toBuffer();
  return new File([new Uint8Array(buffer)], name, { type: "image/png" });
}

function makeRequest(formData: FormData): NextRequest {
  return new NextRequest("http://localhost/api/posts/upload", { method: "POST", body: formData });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "user_1" });
  mocks.getOrCreateDefaultAccount.mockResolvedValue({ id: "acc_1" });
  mocks.createPost.mockImplementation(async (input: Record<string, unknown>) => [{ id: "post_1", ...input }]);
  mocks.replaceSlides.mockResolvedValue([]);
  mocks.logPostEvent.mockResolvedValue([{}]);
  mocks.uploadSlideJpeg.mockImplementation(async (key: string) => `https://cdn.example.com/${key}`);
  mocks.getPost.mockImplementation(async (id: string) => ({
    id,
    accountId: "acc_1",
    type: "single",
    template: "manual",
    topic: "Unggahan manual",
    caption: "Halo",
    hashtags: [],
    status: "needs_review",
    scheduledFor: null,
    errorMessage: null,
    slides: [{ position: 1, kind: "upload", imageUrl: "https://cdn.example.com/posts/post_1/slide-01.jpg" }],
    postEvents: [],
  }));
});

describe("POST /api/posts/upload", () => {
  it("rejects unauthenticated requests", async () => {
    mocks.requireUser.mockRejectedValue(new Error("UNAUTHORIZED"));
    const form = new FormData();
    form.append("images", await makeImageFile("a.png", 1080, 1080));
    const res = await POST(makeRequest(form));
    expect(res.status).toBe(401);
    expect(mocks.createPost).not.toHaveBeenCalled();
  });

  it("rejects a request with zero images", async () => {
    const form = new FormData();
    form.append("caption", "Halo");
    const res = await POST(makeRequest(form));
    expect(res.status).toBe(400);
    expect(mocks.createPost).not.toHaveBeenCalled();
  });

  it("rejects more than 10 images", async () => {
    const form = new FormData();
    for (let i = 0; i < 11; i += 1) form.append("images", await makeImageFile(`${i}.png`, 1080, 1080));
    const res = await POST(makeRequest(form));
    expect(res.status).toBe(400);
    expect(mocks.createPost).not.toHaveBeenCalled();
  });

  it("rejects a caption over 2200 characters", async () => {
    const form = new FormData();
    form.append("images", await makeImageFile("a.png", 1080, 1080));
    form.append("caption", "x".repeat(2201));
    const res = await POST(makeRequest(form));
    expect(res.status).toBe(400);
    expect(mocks.createPost).not.toHaveBeenCalled();
  });

  it("rejects an image with an out-of-range aspect ratio before creating any row", async () => {
    const form = new FormData();
    form.append("images", await makeImageFile("a.png", 1080, 300));
    form.append("caption", "Halo");
    const res = await POST(makeRequest(form));
    expect(res.status).toBe(400);
    expect(mocks.createPost).not.toHaveBeenCalled();
    expect(mocks.uploadSlideJpeg).not.toHaveBeenCalled();
  });

  it("creates a single-type post for one image", async () => {
    const form = new FormData();
    form.append("images", await makeImageFile("a.png", 1080, 1080));
    form.append("caption", "Halo dunia");
    form.append("hashtags", JSON.stringify(["freelance", "tips"]));
    const res = await POST(makeRequest(form));
    expect(res.status).toBe(201);
    expect(mocks.createPost).toHaveBeenCalledWith(
      expect.objectContaining({ type: "single", template: "manual", status: "needs_review", hashtags: ["freelance", "tips"] }),
    );
    expect(mocks.replaceSlides).toHaveBeenCalledWith("post_1", [
      expect.objectContaining({ postId: "post_1", position: 1, kind: "upload", imageUrl: expect.any(String) }),
    ]);
    expect(mocks.logPostEvent).toHaveBeenCalledWith("post_1", expect.any(String));
  });

  it("creates a carousel-type post for multiple images, in submitted order", async () => {
    const form = new FormData();
    form.append("images", await makeImageFile("first.png", 1080, 1080));
    form.append("images", await makeImageFile("second.png", 1080, 1080));
    form.append("images", await makeImageFile("third.png", 1080, 1080));
    form.append("caption", "Carousel manual");
    const res = await POST(makeRequest(form));
    expect(res.status).toBe(201);
    expect(mocks.createPost).toHaveBeenCalledWith(expect.objectContaining({ type: "carousel" }));
    expect(mocks.replaceSlides).toHaveBeenCalledWith(
      "post_1",
      [1, 2, 3].map((position) => expect.objectContaining({ position, kind: "upload" })),
    );
  });

  it("falls back to a derived topic when caption is empty", async () => {
    const form = new FormData();
    form.append("images", await makeImageFile("a.png", 1080, 1080));
    const res = await POST(makeRequest(form));
    expect(res.status).toBe(201);
    expect(mocks.createPost).toHaveBeenCalledWith(expect.objectContaining({ topic: "Unggahan manual", caption: null }));
  });

  it("rolls back the post if uploading a slide image fails", async () => {
    mocks.uploadSlideJpeg.mockRejectedValueOnce(new Error("R2 down"));
    const form = new FormData();
    form.append("images", await makeImageFile("a.png", 1080, 1080));
    form.append("caption", "Halo");
    const res = await POST(makeRequest(form));
    expect(res.status).toBe(502);
    expect(mocks.deletePost).toHaveBeenCalledWith("post_1");
  });
});
