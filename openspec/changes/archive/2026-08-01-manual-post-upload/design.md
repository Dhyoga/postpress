## Context

Postpress's only existing post-creation path is planner/copywriter-driven: `POST /api/posts` requires `topic` + `template` (a Satori registry id), a post is generated via `generatePostContent()` (LLM copy → Satori → resvg → sharp → R2), and only then does it reach `needs_review`. `lib/instagram/publish.ts` (`attemptPublish`) is already fully decoupled from *how* a slide's `imageUrl` was produced — it just reads `posts` + ordered `slides` rows and posts `slide.imageUrl` to the Graph API. This is confirmed by `lib/instagram/publish.ts`'s only precondition: `post.slides.length > 0` with each slide's `imageUrl` set.

`posts.template` and `posts.type` and `slides.kind`/`slides.content` are plain `text`/`jsonb` columns — validated only at the Zod/TypeScript boundary (`CreatePostSchema`, `TemplateId`, `SlideKind` unions), not by a Postgres enum or check constraint. That means adding a new accepted value (`template: "manual"`, `kind: "upload"`) is a type/validator change, not a schema migration — important given AGENTS.md requires asking before "mengubah skema database yang sudah dipakai produksi."

## Goals / Non-Goals

**Goals:**
- Let a user create a post from uploaded image(s) without invoking the LLM copywriter or Satori renderer.
- Reuse `posts`/`slides` as-is (no migration) and `attemptPublish`/`publish:hourly` as-is (no publish-path changes).
- Keep the human-approval gate intact: manual posts still pass through `needs_review` → `approved` before `publish:hourly` (or "Publish sekarang") can touch Instagram. This is non-negotiable per AGENTS.md ("Mengubah alur approval... menambah jalur yang bisa publish tanpa persetujuan manusia" requires asking first — this design deliberately avoids that path).
- Give the uploaded images a public URL Meta's Graph API can fetch, exactly like rendered slides already do.
- Surface manual posts naturally in the existing Queue/History UI without a parallel "kind of post" concept leaking through the whole app.

**Non-Goals:**
- No image editing (crop/filter/text overlay) — upload as-is, only re-encode to JPEG.
- No automatic aspect-ratio correction/cropping — out-of-range images are rejected with an actionable error, not silently resized/cropped.
- No change to `attemptPublish`, the Graph API client, or `publish:hourly` — this change is proven out specifically *because* those are already render-agnostic.
- No bulk/multi-post upload (e.g. zip of many posts) — one form submission creates exactly one post.
- No drag-to-reorder with a DnD library — carousel image order is set by upload order, adjustable with simple up/down controls.

## Decisions

**1. Sentinel values instead of nullable columns.** `posts.template = "manual"` and `slides.kind = "upload"` are added as new literal members of the existing `TemplateId`/`SlideKind` unions, and `slides.content` is stored as `{}` for uploaded slides. Alternative considered: make `posts.template` and `slides.content` nullable via migration. Rejected because it touches a production schema/column that every existing row and query already depends on being non-null, for no behavioral gain — the sentinel achieves the same thing at the type layer only, and every other codepath (`toPostView`, `getTemplate`, registry lookups) is keyed off `template`/`kind` as opaque strings already, so no registry code needs to special-case `"manual"` (it simply never looks it up — the render pipeline is never invoked for these posts).

**2. New dedicated endpoint (`POST /api/posts/upload`), not an extended `POST /api/posts`.** `CreatePostSchema` today requires `template: z.enum(TEMPLATE_IDS)` and `topic`, and expects JSON, not `multipart/form-data`. Alternative considered: make `template` optional in the existing route and branch on presence of an `images` field. Rejected — mixing JSON-body/topic-driven and multipart/file-driven creation in one handler makes both harder to read and validate, and the existing route's tests/behavior for the generated-post path stay completely untouched this way (lower risk).

**3. `topic` is derived from `caption`, not a separate user-entered field.** `posts.topic` is `NOT NULL` and used as the display title everywhere in Queue/History. Manual uploads don't have a "topic" concept the user thinks about, so the endpoint sets `topic = caption.slice(0, 300)` (falls back to `"Unggahan manual"` if caption is empty). Alternative considered: add a separate optional "title" field to the upload form. Rejected as an extra required decision for the user for a value that's only used as a list label.

**4. Status goes straight to `needs_review` (never `generating`).** `POST_TRANSITIONS.draft` already allows `["generating", "needs_review"]`, so inserting a manual post's row directly with `status: "needs_review"` is not a new transition — it's the same rule the state machine already encodes for a `draft` skipping generation. This preserves the mandatory approval step and requires no state-machine change.

**5. Image validation happens in the API route, before any DB/R2 write, using `sharp` metadata.** Rules: 1–10 images (Instagram carousel limit is 2–10, so 1 image auto-becomes `type: "single"` and additional images beyond 10 are rejected); each file must be decodable by `sharp` (covers JPEG/PNG/WEBP input) and its aspect ratio (width/height) must fall within Instagram's accepted range for feed media, 0.8 (4:5) to 1.91 (91:100 landscape) — checked directly against Meta's documented bounds rather than invented ones. Failing any single image rejects the whole request with an actionable, specific message (which file, why) — nothing partially persists. Alternative considered: auto-crop/pad out-of-range images to fit. Rejected as a Non-Goal (silent pixel changes to a user's uploaded photo are surprising) and higher implementation risk.

**6. Images are re-encoded to JPEG via `sharp(...).jpeg({ quality: 90 })` before upload**, reusing the exact quality setting `lib/render/render.ts#svgToJpeg` already uses, and uploaded through the *existing* `uploadSlideJpeg`/`slideObjectKey(postId, position)` helpers unchanged — per AGENTS.md rule #2 ("Instagram hanya menerima JPEG"), this rule applies identically whether the JPEG came from Satori or from a re-encoded upload, so the same helper enforces it in both places.

**7. Queue UI shows real thumbnails for manual posts, not `MiniSlide` template blocks.** `lib/posts/view.ts#toPostView` gains a `slideImages: (string | null)[]` array (same order/index as the existing `slideKinds`), and `MiniSlide` renders an `<img>` when `kind === "upload"` and an `imageUrl` is present, falling back to today's placeholder block otherwise. This is additive to the existing `Post` view shape — no existing consumer of `slideKinds` breaks.

## Risks / Trade-offs

- [Users upload very large image files, slowing the request / risking a timeout] → Reject files above a fixed size cap (10 MB per image) before attempting to decode them; the size check runs before the `sharp` decode to avoid wasting CPU on an oversized file.
- [A partially-valid carousel upload (e.g. image 3 of 5 fails validation) leaves an orphaned post or partial slides] → All images are validated *before* the post row or any slide row is created; the R2 upload + `replaceSlides` + `updatePost` sequence only runs after every image in the batch has passed validation, so a rejected request never touches the DB or R2.
- [Adding `"manual"`/`"upload"` sentinel strings could silently collide with a future real template/slide-kind name] → Both are namespaced/obviously-reserved words unlikely to collide with future Satori template ids (which follow content-shape names like `cover`, `point`, `quote`, `cta`); documented here so future template additions know to avoid them.
- [Public R2 URLs for user-uploaded photos are reachable by anyone with the URL, same as rendered slides today] → No new exposure — this matches the existing trust model for rendered slide JPEGs (AGENTS.md already accepts this for the render pipeline; not something this change introduces or changes).

## Migration Plan

No database migration. Deploy is a standard code-only release:
1. Ship the new `TemplateId`/`SlideKind` sentinel values, `lib/posts/manual-upload.ts`, and `POST /api/posts/upload`.
2. Ship the UI additions (`ManualUploadModal`, Queue entry point, `MiniSlide`/`QueueDetailModal` updates).
3. No feature flag needed — the new endpoint/UI are strictly additive and don't touch any existing post's data or the publish path; rollback is a plain revert.

## Open Questions

- Should manual posts be allowed to skip `scheduledFor` entirely and only be published via the manual "Publish sekarang" button? (Resolved for v1: yes — `scheduledFor` is optional at upload time, editable later from the existing Queue detail schedule field, exactly like generated posts.)
