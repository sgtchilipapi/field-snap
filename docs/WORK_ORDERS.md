# 23. Work Orders

This file is the prescriptive implementation plan for the MVP. If [`SPEC.md`](SPEC.md) or [`ARCHITECTURE.md`](ARCHITECTURE.md) leaves multiple valid interpretations, this file defines the implementation choice so the implementing agent does not need to guess.

## How to use this document

1. Build the work orders in sequence.
2. Do not widen scope inside a work order. If a requirement is not listed here or in the spec, leave it out.
3. Keep route handlers thin. Put domain logic in server-side services and integration modules.
4. Validate every external boundary: env, request params, JSON bodies, multipart uploads, OAuth callbacks, and AI responses.
5. Every mutating operation must check authentication, business membership, and role authorization before touching data or Drive.
6. Never persist document bytes outside Google Drive. Processing may use memory or a short-lived temp buffer only.
7. Every work order that changes schema must include a migration and updated typed models.
8. Every work order that adds a route must include at least one happy-path test, one auth or permission failure test, and one validation or integration failure test.

## MVP implementation decisions

These decisions resolve current ambiguities in the higher-level docs.

1. Use a single Next.js App Router TypeScript application for the MVP. Keep frontend pages and API routes in one repo.
2. Use business-scoped app routes. The selected business comes from the URL, not from an opaque global session flag.
3. `POST /businesses` creates the business row and owner membership only. Google Drive connection and Drive folder creation happen in later work orders.
4. There is no job-assignment model in the MVP. All active members of a business can view that business's active jobs.
5. Only `owner_admin` can create, edit, or archive jobs in the MVP.
6. Only `owner_admin` and `reviewer` can upload general business documents in the MVP.
7. Invitation delivery in the MVP is a copyable invite link. Email sending is optional and not required.
8. Use a durable background queue for document AI processing. Do not rely on in-memory fire-and-forget tasks tied to the web request.
9. Use `Field-Snap` as the user-facing product name everywhere.

## Shared constants

### Roles

```text
owner_admin
reviewer
field_user
```

### Membership statuses

```text
active
disabled
```

### Job statuses

```text
active
archived
```

### Document statuses

```text
uploaded_to_in_process
ai_processing
auto_filed
needs_review
reviewed
failed
```

### Job folder keys

```text
in_process       -> 00 In-Process
receipts         -> 01 Receipts
vendor_bills     -> 02 Vendor Bills
customer_invoices -> 03 Customer Invoices
job_photos       -> 04 Job Photos
contracts        -> 05 Contracts
permits          -> 06 Permits
change_orders    -> 07 Change Orders
equipment        -> 08 Equipment
needs_review     -> 99 Needs Review
```

### General folder keys

```text
in_process       -> 00 In-Process
insurance        -> 01 Insurance
licenses         -> 02 Licenses
tax              -> 03 Tax
payroll          -> 04 Payroll
bank_credit_card -> 05 Bank and Credit Card
loans_financing  -> 06 Loans and Financing
contracts_legal  -> 07 Contracts and Legal
needs_review     -> 99 Needs Review
```

### Default categories

```text
Landscaping
HVAC
Plumbing
Electrical
Cleaning
General Contracting
Other
```

### Confidence rule

```text
confidence >= 0.95 -> auto-file and allow rename
confidence < 0.95  -> route to Needs Review
```

### Route structure

Use these app routes:

```text
/login
/businesses
/businesses/new
/businesses/[businessId]/jobs
/businesses/[businessId]/jobs/[jobId]
/businesses/[businessId]/jobs/[jobId]/snap
/businesses/[businessId]/snap
/businesses/[businessId]/upload-general
/businesses/[businessId]/review
/businesses/[businessId]/documents/[documentId]
/businesses/[businessId]/settings
/invitations/[token]
```

### Suggested code layout

```text
src/app/
  (public)/
  businesses/[businessId]/
  api/
src/components/
src/server/auth/
src/server/db/
src/server/services/
src/server/integrations/drive/
src/server/integrations/ai/
src/server/queue/
src/server/audit/
src/lib/
```

## WO-01 — Project scaffold

Status

`done`

Goal

Create a runnable, testable application foundation so later work orders only add business functionality instead of reworking infrastructure.

Depends on

`none`

Implement

1. Create a Next.js App Router TypeScript project with lint, format, test, and build scripts wired from day one.
2. Add a minimal public layout for unauthenticated screens and an authenticated app layout shell for future business pages.
3. Add environment validation that fails fast at boot for all required runtime values. Include at minimum database URL, app base URL, session secret, Google OAuth credentials, Gemini API key, and queue connection settings.
4. Add a database access layer and migration workflow. The schema can start small, but migrations must be the only way schema changes are applied.
5. Add a base protected-route mechanism so business pages cannot render for unauthenticated users.
6. Add a simple `/api/health` endpoint that returns a healthy response and verifies database connectivity.
7. Add PWA baseline metadata only: manifest, icons, theme color, and installability metadata. Do not build offline queueing yet.
8. Add shared UI primitives needed by later work: page container, header, nav slot, form pattern, loading state, empty state, and toast or alert pattern.
9. Add server-side error logging hooks and user-facing error boundaries so later features do not have to invent their own patterns.
10. Add a placeholder authenticated landing route that will later redirect into business-scoped pages once memberships exist.

Acceptance

1. The app boots locally with valid env vars and fails clearly when env vars are missing.
2. Unauthenticated access to protected pages redirects to `/login`.
3. `/api/health` returns success and confirms the database is reachable.
4. The project already has a place for server services, integrations, and queue code so later work does not pile logic into route handlers.
5. User-facing product copy uses `Field-Snap`.

## WO-02 — Google login

Status

`done`

Goal

Implement Google authentication, persistent user records, and a stable session model.

Depends on

`WO-01`

Implement

1. Add Google OAuth sign-in and sign-out flows.
2. On first login, create a `users` row keyed by `google_sub`. On repeat login, update `name` and `avatar_url` if either changed.
3. Reject login if Google does not provide a verified email address. The app depends on email identity for invitations.
4. Create a server-side session that stores the authenticated user id. Do not expose provider tokens to the frontend.
5. Add `GET /me` returning the current user plus memberships grouped by business, including role and membership status.
6. After successful login, if the user has no business memberships, route them to `/businesses/new`. Otherwise route them to `/businesses`.
7. Add logout that clears the session fully and does not leave a stale authenticated UI state in the browser.
8. Add login UI states for loading, access denied, callback failure, and unexpected provider errors.
9. Make sure auth callback errors are logged with enough context to diagnose provider misconfiguration without leaking secrets.

Acceptance

1. A brand-new Google user can sign in and gets a `users` row created.
2. A returning user keeps the same app identity and does not get duplicate rows.
3. `/me` returns the authenticated user and memberships only when a valid session exists.
4. Logging out removes access to protected pages immediately.
5. Missing-email and callback-failure cases produce controlled errors instead of broken redirects.

## WO-03 — Business creation and switcher

Status

`done`

Goal

Create the business container model and the route-driven business switcher that all later features depend on.

Depends on

`WO-02`

Implement

1. Add `businesses` and `business_memberships` persistence matching the architecture doc.
2. Implement `POST /businesses` to create the business row and an `owner_admin` membership for the creator. Do not connect Drive here.
3. Implement `GET /businesses` to return every business the user belongs to, including their role and whether Drive is connected.
4. Implement `GET /businesses/:businessId` to return basic business details needed by the app shell and settings pages.
5. Build `/businesses/new` as the first-time setup page with a single required field for business name.
6. Build `/businesses` as the business picker page. If the user belongs to exactly one business, redirect them directly into that business context.
7. Make the active business URL-driven. The switcher in the app header must navigate between `/businesses/[businessId]/...` routes instead of storing a hidden active-business flag.
8. Make membership checks business-scoped. A user may have access to one business and not another, and the app must enforce that on every business route and every business API endpoint.
9. Add onboarding handling so a newly created business routes the owner toward Drive connection next, not to a dead-end page.

Acceptance

1. A signed-in user can create multiple businesses over time.
2. Creating a business automatically creates the corresponding `owner_admin` membership.
3. The app shell can switch between businesses by navigating to business-scoped routes.
4. Users cannot access a business they do not belong to, even if they guess the URL.
5. No Drive data is created yet during business creation.

## WO-04 — Google Drive connection

Status

`done`

Goal

Connect a business to the owner's Google Drive and establish the root folder that later work will build under.

Depends on

`WO-03`

Implement

1. Add Drive connect UI under business settings and allow only `owner_admin` to use it.
2. Implement `POST /businesses/:businessId/drive/connect` to start Google Drive OAuth with business-scoped state and CSRF protection.
3. Request the minimum useful Drive scope first. If `drive.file` proves insufficient for owner-authorized root folder creation and later file movement, broaden to `drive`.
4. Implement `GET /auth/google/drive/callback` to exchange the OAuth code, use business-scoped state plus CSRF validation, encrypt token material, and persist a single active `drive_connections` record for the business.
5. Create the business root folder exactly as `Field-Snap - [Business Name]` if `businesses.drive_root_folder_id` is empty.
6. If the business already has a root folder id, verify the app can still access it and reuse it instead of creating a duplicate tree.
7. Update the business record with the root folder id once it is confirmed valid.
8. Implement `GET /businesses/:businessId/drive/status` returning `connected`, `google_account_email`, and `root_folder_id`.
9. Build a settings view that shows connected account email, connection status, root folder id, and an `Open in Drive` action when a root folder exists.
10. Handle reconnect cleanly. A reconnect should refresh token material and keep the same business association.
11. Mark Drive connection status `error` or `revoked` when callback processing or later API calls prove the token is no longer usable.

Acceptance

1. An owner can connect a Google Drive account for a business.
2. The app creates or reuses exactly one root folder named `Field-Snap - [Business Name]`.
3. The resulting root folder id is stored on the business record.
4. A non-owner cannot start or complete a Drive connection for the business.
5. The settings page clearly shows whether Drive is connected and which Google account is attached.

## WO-05 — Default folder template creation

Status

`done`

Goal

Create the default category folders, general business folders, and persisted folder map that the rest of the product relies on.

Depends on

`WO-04`

Implement

1. Add a reusable server service named `ensureBusinessFolderTemplate(businessId)` that can be called safely more than once.
2. Under the business root folder, create one Drive folder per default category and persist a `categories` row for each with `is_default=true`.
3. Create the `General Business Docs` folder under the business root and store its id on `businesses.general_docs_folder_id`.
4. Under `General Business Docs`, create the exact general subfolders defined in the shared constants section, then persist matching `general_folders` rows keyed by folder key.
5. Persist each default category's `drive_folder_id` so job creation can place jobs under the correct category without searching Drive at runtime.
6. Make the service idempotent. If some folders or DB rows already exist, reuse and repair them instead of duplicating them.
7. Trigger this service automatically after a successful first-time Drive connection.
8. Also expose it behind an owner-only repair action in business settings for the case where folders were manually deleted from Drive later.
9. If a required folder is missing during repair, recreate it and update the stored folder id.
10. Keep the folder names exactly aligned with the docs. Later work orders depend on exact naming and exact keys.

Acceptance

1. A newly connected business ends up with category folders plus a `General Business Docs` subtree.
2. `categories` and `general_folders` rows are present and keyed exactly as expected.
3. Re-running the folder template creation does not create duplicates.
4. If a folder was deleted manually, the repair action recreates it and updates stored ids.

## WO-06 — Job creation

Status

`done`

Goal

Create jobs with predictable metadata, Drive folder structure, and stored subfolder ids.

Depends on

`WO-05`

Implement

1. Add the `jobs` and `job_folders` persistence from the architecture doc.
2. Build the create-job page and form with these inputs: `category`, `client_name`, `job_name`, optional `address`, and `job_date`.
3. Treat `job_date` as required in the actual form even though it is conceptually optional in the higher-level spec. Pre-fill it with today's date in the user's browser locale and allow edits.
4. Enforce validation: required trimmed strings for `client_name` and `job_name` with a max length of 120 characters each, optional `address` capped at 255 characters, and ISO date formatting for `job_date`.
5. Allow choosing an existing category or creating a new custom category inline. When creating a custom category, create the DB row and its Drive category folder before creating the job.
6. Only `owner_admin` can create jobs in the MVP. `reviewer` and `field_user` are read-only for job creation and editing.
7. Build the job folder name exactly as `Client Name - Job Name - YYYY-MM-DD`.
8. Reject creation as a duplicate if the same business already has an active job with the same `client_name`, `job_name`, and `job_date`.
9. Create the job folder under the selected category Drive folder.
10. Create all required job subfolders and persist them in `job_folders` using the exact job folder keys defined above.
11. Persist on the `jobs` row the top-level job folder id, the `in_process` folder id, and the `needs_review` folder id for fast upload and review workflows.
12. Implement `GET /businesses/:businessId/jobs`, `GET /businesses/:businessId/jobs/:jobId`, `PATCH /businesses/:businessId/jobs/:jobId`, and `POST /businesses/:businessId/jobs/:jobId/archive`.
13. Archiving a job sets `status=archived` only. Do not delete or rename existing Drive folders.
14. Add a job detail screen with the core metadata, subfolder summary, and open-in-Drive action.

Acceptance

1. Creating a job creates the expected Drive folder tree under the correct category.
2. The `jobs` row and all `job_folders` rows are persisted with exact folder keys.
3. Duplicate active jobs with the same identifying fields are blocked.
4. Only owners can create, edit, and archive jobs.
5. Archived jobs remain in Drive and become filtered results in the app.

## WO-07 — Job list and job detail

Status

`done`

Goal

Make jobs easy to find and open from both desktop and mobile flows.

Depends on

`WO-06`

Implement

1. Build the jobs list page for a business using the `GET /jobs` endpoint.
2. Support filtering by `status`, `category`, and search text.
3. Search must match `client_name`, `job_name`, and `address`.
4. Default sort is `created_at desc`.
5. For the MVP, do not build pagination yet. Return a bounded list of recent jobs with a hard server-side cap of 100 rows.
6. Show active and archived states distinctly in the UI.
7. Show enough information on each job row or card to make selection fast on mobile: client name, job name, category, job date, and archive state.
8. Add an `Open in Drive` action from the job detail screen using the top-level `drive_folder_id`.
9. Add a job-level `Snap` entry point that routes directly into the job upload flow.
10. Because the MVP has no job-assignment model, all business members can see the business's active jobs. Do not create a fake assignment layer.
11. Use the label `Jobs` for the field-user navigation rather than `My Jobs` to avoid implying assignment logic that does not exist.

Acceptance

1. Users can reliably find jobs by search and filter.
2. Job detail loads the correct metadata and Drive link.
3. Field users, reviewers, and owners can view active jobs within their business.
4. The UI does not imply a job-assignment system that the backend does not have.

## WO-08 — Image capture/upload

Status

`done`

Goal

Let users capture or pick a single image and upload it directly into the correct Drive `00 In-Process` folder while creating a `documents` row.

Depends on

`WO-07`

Implement

1. Build the job upload UI using a camera or file input based on `<input type="file" accept="image/*" capture="environment">`.
2. Support one image per request. Do not add PDF upload, multi-file upload, or offline queueing in the MVP.
3. Accept common image types the browser can provide, including JPEG and PNG. Accept HEIC or HEIF only if the browser submits them as a normal file upload.
4. Add a max file size guard before upload and on the server. Use a 15 MB limit.
5. Implement `POST /businesses/:businessId/jobs/:jobId/documents/upload` as multipart upload.
6. Allow `owner_admin`, `reviewer`, and `field_user` to upload to active jobs they can access.
7. On upload, stream the original file to the job's `in_process` folder in Google Drive first.
8. Only create the `documents` row after Drive upload succeeds. If Drive upload fails, return an error and do not create a partial row.
9. Populate the `documents` row with at least: `business_id`, `job_id`, `uploaded_by_user_id`, `capture_context='job'`, `original_drive_file_id`, `current_drive_file_id`, `current_drive_folder_id`, original filename, current filename, mime type, file size, and `status='uploaded_to_in_process'`.
10. Enqueue a document-processing job immediately after the DB row is created.
11. Return the HTTP response as soon as the Drive upload and DB insert succeed. Do not wait for AI classification.
12. Show minimal UX states only: idle, uploading, upload failed, uploaded.
13. Disable duplicate submissions while an upload is in progress so double-taps do not create accidental duplicates.

Acceptance

1. A user can snap or pick an image from a job detail flow.
2. The file appears in the correct job `00 In-Process` folder in Drive.
3. A `documents` row is created with `status='uploaded_to_in_process'`.
4. AI processing is started asynchronously after upload without blocking the user's success state.
5. Failed uploads do not leave orphaned document rows.

## WO-09 — Gemini provider abstraction

Status

`done`

Goal

Create a provider boundary for document classification so the rest of the app depends on one normalized result shape instead of a specific AI SDK response.

Depends on

`WO-08`

Implement

1. Add an `AIProvider` interface with a single classification method that accepts image bytes plus normalized business and job context.
2. Implement a Gemini provider for the MVP.
3. Keep prompt construction separate from provider transport so prompts can evolve without touching caller code.
4. Send the exact context needed by the spec: business name, capture context, job data when present, category, and allowed target folders.
5. Require the provider to return a normalized object with these fields: `document_type`, `target_folder_key`, `suggested_filename`, `vendor_or_party`, `document_date`, `amount`, `currency`, `invoice_number`, `due_date`, `confidence`, `needs_review`, `reason`, and raw provider payload.
6. Validate the provider response against a strict schema before the rest of the app sees it.
7. Clamp confidence into the `0..1` range only after successful schema parsing. If parsing fails entirely, treat the result as invalid.
8. Reject impossible target folders for the current context. Example: a job-context document cannot target `bank_credit_card`.
9. Do not let the provider assign accounting categories, payment status, or any non-MVP bookkeeping treatment.
10. Add unit tests using fixtures for at least: a clear receipt, a clear job photo, invalid JSON, missing required fields, and an impossible folder choice.
11. Invalid or unusable provider output must become a normalized "needs review" outcome rather than crashing the worker.

Acceptance

1. The worker can call one provider method and receive a predictable normalized result.
2. Invalid AI output does not break processing and instead routes into review handling.
3. Provider code does not leak SDK-specific response handling into route handlers or document services.

## WO-10 — AI processing and auto-filing

Status

`done`

Goal

Process uploaded documents in the background, move them to the right Drive folder, rename only when safe, and persist the result.

Depends on

`WO-09`

Implement

1. Add a durable queue-backed document processing worker. The queue payload must contain `documentId` and a correlation id for logging.
2. When a worker starts processing, set `documents.status='ai_processing'`.
3. Load the document, business, uploader, job, relevant folder ids, and the allowed folder map for the document context.
4. Fetch the original file bytes from Google Drive using the stored Drive file id.
5. Call the AI provider with the correct capture context and allowed folders.
6. Persist the raw AI payload and normalized fields back onto the `documents` row.
7. Apply the confidence rule exactly: `confidence >= 0.95` auto-files; anything lower routes to review.
8. If the outcome is high-confidence and valid, move the file from `00 In-Process` to the selected target folder.
9. Only after a successful move, optionally rename the file if the AI suggested a filename and the filename is safe after sanitization.
10. Store sanitized filenames only. Strip or replace illegal characters and cap filename length at 120 characters.
11. On successful auto-file, update `current_drive_folder_id`, `current_filename`, `target_folder_key`, `document_type`, AI metadata fields, and `status='auto_filed'`.
12. On a low-confidence but otherwise valid classification, move the file to the correct `needs_review` folder for that context, update metadata fields, and set `status='needs_review'`.
13. If the AI call fails entirely, set `status='failed'`, set `failure_reason='ai_error'`, and move the file to `needs_review` if that move can be completed.
14. If the AI result is invalid for the current context, treat it as reviewable rather than fatal: move to `needs_review`, persist the raw response, and set `status='needs_review'`.
15. If the Drive move fails after AI classification, leave the file where it currently is, set `status='failed'`, and set `failure_reason='drive_move_error'`.
16. Record audit events for AI classification, file move, rename, and final routing decision.
17. Retry transient provider or Drive errors at most one additional time after the initial attempt. Validation failures are never retried.

Acceptance

1. A clear high-confidence receipt lands in the expected target folder and can be renamed safely.
2. A low-confidence or ambiguous document lands in `Needs Review` and preserves AI metadata for the reviewer.
3. AI or Drive failures produce `failed` documents visible to reviewers.
4. Worker logic is durable and not tied to the lifecycle of the original upload HTTP request.

## WO-11 — General upload

Status

`done`

Goal

Support uploads for business-level documents that are not tied to a specific job.

Depends on

`WO-10`

Implement

1. Build a general upload page at `/businesses/[businessId]/upload-general`.
2. Use the same upload mechanics as job uploads, but target `General Business Docs/00 In-Process`.
3. Implement `POST /businesses/:businessId/documents/upload-general` as multipart upload returning immediately after Drive upload and DB insert.
4. Allow `owner_admin` and `reviewer` to use this flow. Do not expose it to `field_user` in the MVP.
5. Create the `documents` row with `capture_context='general'` and `job_id=null`.
6. Use the general folder map as the allowed AI target set.
7. Route successful AI classifications into the correct general folder keys: `insurance`, `licenses`, `tax`, `bank_credit_card`, `payroll`, `loans_financing`, or `contracts_legal`.
8. Route low-confidence or invalid results into the general `needs_review` folder.
9. Reuse the same document detail model so review screens do not have to special-case general uploads everywhere.
10. Keep the UI language clear that this flow is for business documents, not job materials.

Acceptance

1. An owner or reviewer can upload a non-job document successfully.
2. The file lands in `General Business Docs/00 In-Process` before AI processing.
3. AI can route valid general documents into the correct general subfolders.
4. Field users do not see or access the general upload flow.

## WO-12 — Review dashboard

Status

`done`

Goal

Provide reviewers and owners a single place to inspect uncertain, failed, and recent documents.

Depends on

`WO-11`

Implement

1. Build a review page for a business with at least three views: `Needs Review`, `Recent Uploads`, and `Failed`.
2. Restrict access to `owner_admin` and `reviewer`.
3. Use `GET /businesses/:businessId/review/needs-review` for the needs-review queue.
4. Use the general documents listing endpoint for `Recent Uploads` and `Failed` views, filtered by status.
5. Show the same core fields everywhere they are available: thumbnail, document type, file status, job or general context, current folder, vendor or party, document date, amount, uploader, created time, confidence, and `Open in Drive`.
6. Make `Failed` include both AI failures and Drive-processing failures, with visible failure reason text.
7. Build a document detail page at `/businesses/[businessId]/documents/[documentId]`.
8. The detail page must show: image preview, current Drive location, AI suggestion, editable metadata fields, audit log, and action controls.
9. The detail page must handle both job-context and general-context documents without splitting into different page types.
10. Do not add bulk actions, rerun AI, Drive deletion, or QBO sync to the review UI in the MVP.
11. Make it easy to move from list to detail and back without losing the current filter context.

Acceptance

1. Reviewers can see uncertain and failed items without custom URLs or manual database inspection.
2. Document detail includes both the AI result and the Drive location.
3. `Open in Drive` works from both list and detail views.
4. The review UI remains explicitly scoped to reviewing and correcting, not accounting workflows.

## WO-13 — Review correction

Status

`done`

Goal

Let reviewers correct the routing and metadata of a document and make that correction visible in both Drive and the audit history.

Depends on

`WO-12`

Implement

1. Implement `PATCH /businesses/:businessId/documents/:documentId/review`.
2. Implement `POST /businesses/:businessId/documents/:documentId/mark-reviewed`.
3. Allow `owner_admin` and `reviewer` only.
4. Support these corrections in the patch route: change job, change folder, edit metadata, and mark reviewed.
5. If `job_id` changes from null to a job id, the document changes context from `general` to `job`.
6. If `job_id` changes from a job id to null, the document changes context from `job` to `general`.
7. If `job_id` changes from one job to another job, resolve the destination folder id using the target job's `job_folders`.
8. Use the submitted `target_folder_key` to resolve the destination folder id for the selected context. Reject folder keys that are invalid for that context.
9. If the destination folder differs from the current folder, move the Drive file and update `current_drive_folder_id`.
10. Update these metadata fields from the request payload when present: `document_type`, `vendor_or_party`, `document_date`, `amount`, `currency`, `invoice_number`, and `due_date`.
11. Do not rename files manually during review in the MVP. Review changes affect folder location and metadata only.
12. If the reviewer marks the document reviewed, set `status='reviewed'`.
13. If the reviewer updates metadata but does not set `mark_reviewed=true`, keep the current status unchanged.
14. If the selected folder already matches the current folder, skip the Drive move and just update metadata and status.
15. Record audit logs for old and new job id, old and new folder id, changed metadata, and the final review status.

Acceptance

1. A reviewer can move a document between folders and between job/general context when needed.
2. The Drive file location matches the corrected routing after a successful review action.
3. Metadata edits are persisted and visible when the document detail page reloads.
4. Every correction leaves an audit trail of what changed.

## WO-14 — Invitations

Status

`done`

Goal

Allow owners to add more users to a business with a secure invite flow tied to Google-login identity.

Depends on

`WO-03`

Implement

1. Add `invitations` persistence as defined in the architecture doc.
2. Only `owner_admin` can create invitations in the MVP.
3. Allow invitations for `field_user` and `reviewer` roles only. Do not invite additional `owner_admin` users in the MVP.
4. Implement `POST /businesses/:businessId/invitations` to create a pending invitation.
5. Generate a cryptographically random token, store only its hash, and set the expiration to exactly 7 days from creation.
6. If there is already a pending invite for the same business and email, revoke the old one and create a new token rather than leaving multiple valid invites active.
7. Build an invitation list UI in business settings showing email, role, status, inviter, created time, and expiration.
8. Surface a copyable invite URL in the UI. Sending email is optional and not required for MVP completion.
9. Implement `GET /invitations/:token` for invite preview before acceptance.
10. Implement `POST /invitations/:token/accept` so a logged-in Google user can accept only when their Google email matches `invited_email` case-insensitively.
11. On acceptance, create or reactivate the `business_memberships` row, mark the invitation accepted, and store `accepted_at`.
12. Reject expired, revoked, already accepted, and email-mismatch tokens with explicit error states.

Acceptance

1. An owner can generate an invite link for a field user or reviewer.
2. The invitee can sign in with Google and accept the invite only if the email matches.
3. Accepting the invite creates a usable membership in the target business.
4. Expired or invalid invites fail safely and visibly.

## WO-15 — Role-based access control

Status

`done`

Goal

Make authorization explicit and consistent across API routes, app routes, and visible navigation.

Depends on

`WO-14`

Implement

1. Add one shared authorization layer used by both pages and API handlers so permission rules are not duplicated ad hoc.
2. Enforce business membership and role checks on every business-scoped route and every business-scoped API endpoint.
3. Implement this exact MVP permission matrix.
4. `owner_admin`: full access to business creation, Drive connection, categories, jobs, uploads, review, invitations, settings, and audit views.
5. `reviewer`: read business data, view jobs, upload to jobs, upload general docs, access review flows, and view audit on document detail; cannot connect Drive, create businesses, or manage invitations.
6. `field_user`: view business jobs, upload to jobs, and view their own upload success states; cannot access review, Drive settings, invitations, or general upload.
7. Hide navigation items the current role cannot use, but do not rely on UI hiding as the actual security control.
8. Ensure cross-business ids are rejected even when the user is valid in some other business.
9. Add explicit forbidden responses instead of generic 404s for authorized-but-disallowed actions, unless hiding route existence is a deliberate security choice for a specific endpoint.
10. Add regression tests covering each role against at least one allowed and one forbidden endpoint.

Acceptance

1. Owners can do everything needed for MVP setup and operations.
2. Reviewers can review but cannot manage Drive or invitations.
3. Field users can upload to jobs but cannot see review or general upload screens.
4. Cross-business access is blocked consistently across page loads and API calls.

## WO-16 — Audit log

Goal

Capture a clear history of important system and user actions so document routing decisions are explainable.

Depends on

`WO-15`

Implement

1. Add an audit-log service instead of inserting audit rows manually from scattered places.
2. Persist all core events listed in the architecture doc, including business creation, Drive connection, job creation, document upload, AI classification, file move, file rename, metadata edit, document review, and invitation actions.
3. Use `actor_user_id=null` for system-driven events including queue processing where no human initiated the final step directly.
4. Standardize action names in code so they are queryable and consistent. Use exactly this dot-style namespace set: `business.created`, `drive.connected`, `job.created`, `document.uploaded`, `document.ai_classified`, `document.auto_filed`, `document.moved`, `document.renamed`, `document.reviewed`, `document.metadata_updated`, `invitation.created`, and `invitation.accepted`.
5. For updates, record both `old_value` and `new_value` with only the relevant changed fields rather than dumping unrelated entity state.
6. Add audit-log retrieval to the document detail endpoint or an adjacent endpoint used by the detail page.
7. Render the audit trail on the document detail page in time order with actor, action, and summary of what changed.
8. Ensure every audit row is business-scoped so no cross-business leakage is possible in history queries.

Acceptance

1. The document detail page shows a meaningful history of document events.
2. Automated AI routing steps are distinguishable from manual reviewer corrections.
3. Field changes in review actions can be reconstructed from the audit history.

## WO-17 — Production hardening

Goal

Make the MVP resilient enough to operate in production without hiding failures or creating silent data loss.

Depends on

`WO-16`

Implement

1. Add structured logging that includes request id, business id, user id when present, document id when present, and queue job id when present.
2. Add user-facing error boundaries and empty states for the main business pages, upload flows, and review flows.
3. Add retry rules for transient Drive and AI failures with small bounded retries. Do not retry validation failures.
4. Add a reconnect flow when Drive tokens are expired or revoked. Business settings should surface this clearly to owners.
5. Detect revoked or unusable Drive credentials during normal operations and update `drive_connections.status` accordingly.
6. Add rate limiting to the highest-risk endpoints: login initiation, invitation creation, and document upload.
7. Ensure failed queue jobs settle the document into either `failed` or `needs_review` instead of disappearing silently.
8. Add monitoring hooks or log markers for: upload success, upload failure, AI success, AI invalid response, AI failure, Drive move failure, Drive reconnect required, and review correction success.
9. Add a repair path for missing folder ids where safe, and otherwise route the affected document to review with a specific failure reason instead of guessing.
10. Confirm that no API response leaks tokens, raw file bytes, or other sensitive internals to the client.
11. Run a manual end-to-end smoke test covering: new owner setup, Drive connect, job create, job upload, auto-file success, needs-review case, manual correction, invitation accept, and revoked-Drive reconnect.

Acceptance

1. AI failures route to reviewable or failed states predictably instead of vanishing.
2. Drive failures surface in the review workflow with explicit failure reasons.
3. Revoked Drive access is detected and owners are prompted to reconnect.
4. Logs and UI states are sufficient to diagnose production issues without direct database forensics.
