## 1. Type-level plumbing (no migration)

- [x] 1.1 Add `"manual"` to the `TemplateId` union in `lib/types.ts`
- [x] 1.2 Add `"upload"` to the `SlideKind` union in `lib/types.ts` and to `SlideBlockKind` in `lib/mock/types.ts`

## 2. Image validation + normalization

- [x] 2.1 Add `lib/posts/manual-upload.ts` with a function that takes a raw `File`/`Buffer`, enforces a max size (10 MB) before decoding, decodes with `sharp`, checks aspect ratio is within 0.8–1.91, and returns a normalized JPEG buffer (quality 90) or throws a `ManualUploadValidationError` with an actionable, file-specific message
- [x] 2.2 Unit test `lib/posts/manual-upload.test.ts`: valid JPEG/PNG/WEBP pass and re-encode to JPEG; oversized file rejected without decoding; undecodable file rejected; aspect ratio outside 0.8–1.91 rejected; aspect ratio at the boundary accepted

## 3. Create-post-from-upload endpoint

- [x] 3.1 Add `CreateManualPostSchema` (zod) validating `caption` (trim, max 2200), `hashtags` (array, max 30 items, each max 50 chars), `scheduledFor` (optional ISO datetime), `accountId`/`planId` (optional uuid)
- [x] 3.2 Add `app/api/posts/upload/route.ts` `POST` handler: `requireUser()`, parse `request.formData()`, extract images (1–10) + text fields, validate every image via `lib/posts/manual-upload.ts` before touching the DB or R2, derive `type` from image count, derive `topic` from `caption` (fallback `"Unggahan manual"`), create the post (`template: "manual"`, `status: "needs_review"`), upload each validated image via `uploadSlideJpeg(slideObjectKey(postId, position), buffer)`, insert `slides` rows (`kind: "upload"`, `content: {}`, `imageUrl`) via `replaceSlides`, call `logPostEvent(postId, "Diunggah manual, menunggu review")`, return `{ post: toPostView(...) }` with 201
- [x] 3.3 On any validation failure, return 400 with an actionable Indonesian error message and issue list; do not create a post or slide row
- [x] 3.4 Test `app/api/posts/upload/route.test.ts` (or colocated with the module it delegates to): single image → `type: "single"`; multiple images → `type: "carousel"`; >10 images rejected; 0 images rejected; caption >2200 chars rejected; unauthenticated request rejected

## 4. Queue/view read-side updates

- [x] 4.1 Extend `PostRow`/`toPostView` in `lib/posts/view.ts` to also return `slideImages: (string | null)[]` (same order as `slideKinds`), sourced from `row.slides[].imageUrl`
- [x] 4.2 Extend the `Post` type in `lib/mock/types.ts` with `slideImages?: (string | null)[]`
- [x] 4.3 Update `components/slides/MiniSlide.tsx` to accept an optional `imageUrl` prop and render an `<img>` thumbnail when `kind === "upload"` and `imageUrl` is present, falling back to the existing placeholder block otherwise
- [x] 4.4 Update `components/queue/QueueDetailModal.tsx` to pass `post.slideImages?.[i]` into each `MiniSlide`, and hide the "Buat ulang"/"Generate sekarang"/"Coba generate ulang" actions when `post.template === "manual"`

## 5. Upload UI

- [x] 5.1 Add `components/posts/ManualUploadModal.tsx`: multi-file image input (accept `image/*`, up to 10), ordered thumbnail preview list with remove + move-up/move-down controls, caption textarea with a running character counter (2200 max), hashtag chip input reusing the `.tag-list`/`.chip-tag`/`.quick-add` pattern from `components/persona/panels/KataKunciPanel.tsx`, optional schedule date/time inputs (same `+07:00` composition as `NewPostModal.tsx`), client-side validation (>=1 image, <=10 images, caption non-empty) before submit
- [x] 5.2 Add `uploadManualPost(formData: FormData): Promise<void>` to `components/posts/PostsProvider.tsx` (posts `FormData` to `/api/posts/upload` with no explicit `content-type` header, then `refresh()`), and expose it on the context
- [x] 5.3 Add an "Upload manual" entry point button in `components/queue/QueueView.tsx` (panel head, alongside the existing "Buat post baru" trigger) that opens `ManualUploadModal`

## 6. Styling

- [x] 6.1 Add minimal CSS for the upload dropzone/thumbnail grid and reordering controls to `app/globals.css`, following existing token conventions (`bg-paper`, `border-rule`, `text-ink`, etc.) — no new colors outside `tailwind.config`

## 7. Verification

- [x] 7.1 `pnpm typecheck` clean
- [x] 7.2 `pnpm test` green (including new tests from tasks 2.2 and 3.4)
- [x] 7.3 `pnpm lint` clean
- [x] 7.4 Manually exercise the flow in the dev server: upload a single image, upload a 3-image carousel, confirm thumbnails render in Queue, approve, then `pnpm cli publish:dry-run <post-id>` succeeds using the uploaded image URLs
