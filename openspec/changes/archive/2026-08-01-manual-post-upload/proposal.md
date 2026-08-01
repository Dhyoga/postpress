## Why

Today every post in Postpress is created through the planner/copywriter LLM pipeline and rendered with Satori (`topic` + `template` → LLM copy → Satori JPEG). Some content the team wants to publish — photos, screenshots, partner assets, one-off announcements — never fits that pipeline: there is no topic for an LLM to write about and no template slot for a photograph to sit in. Operators currently have no way to get a raw image onto the Instagram account through Postpress at all; they'd have to publish outside the tool, which breaks the single history/audit trail the app exists to provide.

## What Changes

- Add a new post-creation path that accepts one or more user-uploaded images directly (no LLM call, no Satori render, no template) plus a manually written caption and hashtags.
- Single image → `posts.type = "single"`; 2+ images → `posts.type = "carousel"`, mapped the same way the existing generated-post path already does.
- Uploaded images are normalized to JPEG and stored in R2 via the existing `uploadSlideJpeg`/`slideObjectKey` helpers, then written as `slides` rows with `imageUrl` set — the same shape `lib/instagram/publish.ts` already consumes, so **no changes to the publish flow or the publish cron are needed**.
- New posts from this path skip the `generating` status entirely and land in `needs_review`, so they still go through the existing human approval gate (`needs_review` → `approved` → `publishing` → `published`) before anything reaches Instagram.
- Users can set an optional `scheduledFor` at upload time, or leave it for later (editable from the existing Queue detail view, unchanged).
- New "Upload manual" entry point in the Queue view, next to the existing "Buat post baru" flow, with an upload/caption/tags/schedule form.
- Existing Queue detail modal is extended to show actual image thumbnails (instead of template placeholder blocks) for manually uploaded posts, and hides the "Generate ulang"/"Generate sekarang" actions for them (there is nothing to regenerate).

## Capabilities

### New Capabilities
- `manual-post-upload`: lets a user create a post by uploading raw image(s) with caption/tags/schedule, bypassing the LLM copywriter and Satori renderer, while reusing the existing posts/slides schema, approval workflow, and Instagram Graph API publish flow.

### Modified Capabilities
(none — no `openspec/specs/` capabilities exist yet in this project, so there is nothing to write a delta against; the queue UI and post-view changes described above are implementation details of the new capability, not changes to a previously specified one.)

## Impact

- **Code**: new API route (`app/api/posts/upload`), new `lib/posts/manual-upload.ts` module, new `ManualUploadModal` UI component, small extensions to `PostsProvider`, `toPostView`/`lib/posts/view.ts`, `MiniSlide`, and `QueueDetailModal`.
- **Data model**: no migration — `posts.template`/`posts.type` and `slides.kind`/`slides.content` are plain `text`/`jsonb` columns (no DB-level enum), so this change adds new accepted values (`template: "manual"`, `kind: "upload"`) at the TypeScript/Zod boundary only.
- **Dependencies**: none new — reuses `sharp` (already a dependency, used by `lib/render/render.ts`) for image normalization/validation and the Next.js `Request.formData()` API for multipart uploads.
- **Instagram Graph API**: no new endpoints called — reuses `attemptPublish` from `lib/instagram/publish.ts` unchanged.
