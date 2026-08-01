## ADDED Requirements

### Requirement: Create a post from uploaded images
The system SHALL allow an authenticated user to create a post by uploading one or more images directly, without invoking the LLM copywriter or the Satori renderer.

#### Scenario: Single image upload creates a single-type post
- **WHEN** a user submits the upload form with exactly one image, a caption, and no additional images
- **THEN** the system creates a post with `type = "single"`, one `slides` row referencing the uploaded image's stored URL, and status `needs_review`

#### Scenario: Multiple images create a carousel-type post
- **WHEN** a user submits the upload form with between 2 and 10 images, in a chosen order
- **THEN** the system creates a post with `type = "carousel"`, one `slides` row per image with `position` matching the chosen order, and status `needs_review`

#### Scenario: More than 10 images is rejected
- **WHEN** a user submits the upload form with more than 10 images
- **THEN** the system rejects the request with an actionable error and creates no post or slide rows

#### Scenario: No images is rejected
- **WHEN** a user submits the upload form with zero images
- **THEN** the system rejects the request with an actionable error and creates no post or slide rows

### Requirement: Uploaded images are validated and normalized before storage
The system SHALL validate every uploaded image and normalize it to JPEG before it is stored, rejecting the entire submission if any image fails validation.

#### Scenario: Undecodable file is rejected
- **WHEN** a user uploads a file that is not a decodable image
- **THEN** the system rejects the request with an actionable error naming the offending file, and creates no post or slide rows

#### Scenario: Image aspect ratio outside Instagram's accepted range is rejected
- **WHEN** a user uploads an image whose width-to-height ratio falls outside Instagram's accepted feed range (0.8 to 1.91)
- **THEN** the system rejects the request with an actionable error naming the offending file and the allowed ratio range, and creates no post or slide rows

#### Scenario: Oversized file is rejected
- **WHEN** a user uploads a file larger than the configured size limit
- **THEN** the system rejects the request with an actionable error naming the offending file, without attempting to decode it

#### Scenario: Valid non-JPEG image is re-encoded to JPEG
- **WHEN** a user uploads a valid PNG or WEBP image that passes validation
- **THEN** the system stores it as a JPEG, matching the format Instagram's Graph API requires for `image_url`

### Requirement: Manual upload posts carry a caption and hashtags
The system SHALL let the user attach a caption and a set of hashtags to a manually uploaded post, using the same limits already enforced for generated posts.

#### Scenario: Caption within limit is accepted
- **WHEN** a user submits a caption of 2,200 characters or fewer
- **THEN** the system stores it on the post's `caption` field

#### Scenario: Caption over limit is rejected
- **WHEN** a user submits a caption longer than 2,200 characters
- **THEN** the system rejects the request with an actionable error and creates no post or slide rows

#### Scenario: Hashtags are stored as an array
- **WHEN** a user submits a list of hashtags (each 50 characters or fewer, up to 30 total)
- **THEN** the system stores them on the post's `hashtags` field in the order submitted

### Requirement: Manual upload posts can be scheduled at creation time or later
The system SHALL let the user optionally set a publish schedule when uploading, and SHALL allow the schedule to be set or changed afterward through the existing post-schedule editing capability.

#### Scenario: Schedule set at upload time
- **WHEN** a user submits the upload form with a schedule date and time
- **THEN** the system stores that value on the post's `scheduledFor` field

#### Scenario: Schedule omitted at upload time
- **WHEN** a user submits the upload form without a schedule
- **THEN** the system creates the post with `scheduledFor` unset, and the existing schedule-editing flow remains available once the post is approved

### Requirement: Manual upload posts still require human approval before publishing
The system SHALL route manually uploaded posts through the same `needs_review` → `approved` approval gate as generated posts, and SHALL NOT introduce any path that publishes a manually uploaded post without explicit human approval.

#### Scenario: New manual upload lands in needs_review, not approved
- **WHEN** a manual upload post is successfully created
- **THEN** its status is `needs_review`, the same state a successfully generated post reaches, and it requires the existing approve action before it can be published

#### Scenario: Manual upload post publishes through the existing publish flow
- **WHEN** a manual upload post has been approved and its scheduled time has arrived (or "Publish sekarang" is used)
- **THEN** the existing Instagram Graph API publish flow (`attemptPublish`) publishes it exactly as it would a generated post, using the `slides.imageUrl` values produced by the upload

### Requirement: Manual upload posts are not eligible for LLM regeneration
The system SHALL NOT offer a "regenerate" or "generate now" action for a manually uploaded post, since it has no template or topic for the copywriter/renderer to act on.

#### Scenario: Regenerate action hidden for manual upload post
- **WHEN** a user views a manually uploaded post in the queue detail view
- **THEN** the interface does not present a "Buat ulang"/"Generate sekarang" action for that post
