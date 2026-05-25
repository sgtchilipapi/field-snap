# 15. Database Model

Use PostgreSQL.

## 15.1 users

```sql
users (
  id uuid primary key,
  google_sub text unique not null,
  email text unique not null,
  name text,
  avatar_url text,
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

## 15.2 businesses

```sql
businesses (
  id uuid primary key,
  name text not null,
  owner_user_id uuid references users(id),
  drive_root_folder_id text,
  general_docs_folder_id text,
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

## 15.3 business_memberships

```sql
business_memberships (
  id uuid primary key,
  business_id uuid references businesses(id),
  user_id uuid references users(id),
  role text not null, -- owner_admin, field_user, reviewer
  status text not null, -- active, disabled
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (business_id, user_id)
)
```

## 15.4 drive_connections

```sql
drive_connections (
  id uuid primary key,
  business_id uuid references businesses(id),
  connected_by_user_id uuid references users(id),
  google_account_email text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  scopes text[] not null,
  status text not null, -- active, revoked, error
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

## 15.5 categories

```sql
categories (
  id uuid primary key,
  business_id uuid references businesses(id),
  name text not null,
  slug text not null,
  is_default boolean not null default false,
  drive_folder_id text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (business_id, slug)
)
```

## 15.6 jobs

```sql
jobs (
  id uuid primary key,
  business_id uuid references businesses(id),
  category_id uuid references categories(id),
  client_name text not null,
  job_name text not null,
  address text,
  job_date date not null,
  drive_folder_id text not null,
  in_process_folder_id text not null,
  needs_review_folder_id text not null,
  status text not null, -- active, archived
  created_by_user_id uuid references users(id),
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

## 15.7 job_folders

```sql
job_folders (
  id uuid primary key,
  job_id uuid references jobs(id),
  folder_key text not null,
  folder_name text not null,
  drive_folder_id text not null,
  created_at timestamptz not null,
  unique (job_id, folder_key)
)
```

Folder keys:

```text
in_process
receipts
vendor_bills
customer_invoices
job_photos
contracts
permits
change_orders
equipment
needs_review
```

## 15.8 general_folders

```sql
general_folders (
  id uuid primary key,
  business_id uuid references businesses(id),
  folder_key text not null,
  folder_name text not null,
  drive_folder_id text not null,
  created_at timestamptz not null,
  unique (business_id, folder_key)
)
```

## 15.9 documents

```sql
documents (
  id uuid primary key,
  business_id uuid references businesses(id),
  job_id uuid references jobs(id),
  uploaded_by_user_id uuid references users(id),

  capture_context text not null, -- job, general
  original_drive_file_id text not null,
  current_drive_file_id text not null,
  current_drive_folder_id text not null,

  original_filename text,
  current_filename text,
  mime_type text,
  file_size_bytes bigint,

  status text not null,
  document_type text,
  target_folder_key text,

  vendor_or_party text,
  document_date date,
  amount numeric(12,2),
  currency text,
  invoice_number text,
  due_date date,

  ai_confidence numeric(5,4),
  ai_needs_review boolean,
  ai_reason text,
  ai_raw_response jsonb,

  failure_reason text,

  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

## 15.10 invitations

```sql
invitations (
  id uuid primary key,
  business_id uuid references businesses(id),
  invited_email text not null,
  role text not null,
  token_hash text not null,
  status text not null, -- pending, accepted, expired, revoked
  invited_by_user_id uuid references users(id),
  expires_at timestamptz not null,
  created_at timestamptz not null,
  accepted_at timestamptz
)
```

## 15.11 audit_logs

```sql
audit_logs (
  id uuid primary key,
  business_id uuid references businesses(id),
  actor_user_id uuid references users(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null
)
```

---

# 16. API Spec

## 16.1 Auth

### `GET /auth/google`

Starts Google login.

### `GET /auth/google/callback`

Handles callback.

### `POST /auth/logout`

Logs out.

### `GET /me`

Returns current user and memberships.

Implementation note:

```text
The active business is determined by the route context.
It is not stored as a separate hidden active-business session flag.
```

---

## 16.2 Businesses

### `POST /businesses`

Creates the business row and owner membership only.

It does not connect Google Drive or create Drive folders.

Request:

```json
{
  "name": "ABC Landscaping"
}
```

Response:

```json
{
  "business_id": "uuid",
  "name": "ABC Landscaping",
  "drive_root_folder_id": null
}
```

### `GET /businesses`

List businesses user belongs to, including role and Drive connection status.

### `GET /businesses/:businessId`

Get business details.

---

## 16.3 Drive Connection

### `POST /businesses/:businessId/drive/connect`

Starts Drive OAuth.

### `GET /auth/google/drive/callback`

Stores Drive token, creates or reuses the root folder, and uses OAuth state to resolve the business association.

### `GET /businesses/:businessId/drive/status`

Returns:

```json
{
  "connected": true,
  "google_account_email": "owner@gmail.com",
  "root_folder_id": "drive_id"
}
```

---

## 16.4 Categories

### `GET /businesses/:businessId/categories`

Returns category list.

### `POST /businesses/:businessId/categories`

Create custom category.

Owner/Admin only.

Request:

```json
{
  "name": "Roofing"
}
```

---

## 16.5 Jobs

### `POST /businesses/:businessId/jobs`

Creates job and Drive folders.

Owner/Admin only.

Request:

```json
{
  "category_id": "uuid",
  "client_name": "Smith Residence",
  "job_name": "Backyard Cleanup",
  "address": "123 Main St",
  "job_date": "2026-05-21"
}
```

Response:

```json
{
  "job_id": "uuid",
  "drive_folder_id": "drive_id",
  "folder_name": "Smith Residence - Backyard Cleanup - 2026-05-21"
}
```

### `GET /businesses/:businessId/jobs`

List jobs visible to the current business member.

There is no job-assignment model in the MVP.

Filters:

```text
status
category
search
```

### `GET /businesses/:businessId/jobs/:jobId`

Get job details.

### `PATCH /businesses/:businessId/jobs/:jobId`

Update job metadata.

Owner/Admin only.

### `POST /businesses/:businessId/jobs/:jobId/archive`

Archive job.

Owner/Admin only.

---

## 16.6 Uploads

### `POST /businesses/:businessId/jobs/:jobId/documents/upload`

Job-specific upload.

Input:

```text
multipart/form-data
file=image
```

Response immediately after upload to Drive:

```json
{
  "document_id": "uuid",
  "status": "uploaded_to_in_process"
}
```

Then async AI processing starts.

### `POST /businesses/:businessId/documents/upload-general`

General/admin upload.

Owner/Admin and Reviewer only.

Input:

```text
multipart/form-data
file=image
```

Response:

```json
{
  "document_id": "uuid",
  "status": "uploaded_to_in_process"
}
```

### `GET /businesses/:businessId/documents/:documentId`

Returns document details.

### `GET /businesses/:businessId/documents`

List documents.

Filters:

```text
status
job_id
document_type
date range
search
```

---

## 16.7 Review

### `GET /businesses/:businessId/review/needs-review`

Returns documents needing review.

### `PATCH /businesses/:businessId/documents/:documentId/review`

Reviewer correction.

Owner/Admin and Reviewer only.

Request:

```json
{
  "job_id": "uuid-or-null",
  "target_folder_key": "receipts",
  "metadata": {
    "document_type": "receipt",
    "vendor_or_party": "Home Depot",
    "document_date": "2026-05-21",
    "amount": 182.44,
    "currency": "USD"
  },
  "mark_reviewed": true
}
```

Backend action:

```text
move Drive file to selected folder
update metadata
create audit log
```

### `POST /businesses/:businessId/documents/:documentId/mark-reviewed`

Marks reviewed without moving.

Owner/Admin and Reviewer only.

---

## 16.8 Invitations

### `POST /businesses/:businessId/invitations`

Owner/Admin only.

Allowed roles:

```text
field_user
reviewer
```

Request:

```json
{
  "email": "crew@example.com",
  "role": "field_user"
}
```

Response includes a copyable invitation link.

### `GET /invitations/:token`

Preview invitation.

### `POST /invitations/:token/accept`

Accept invitation after Google login.

The authenticated Google email must match the invited email.

---

# 17. AI Processing Service

## 17.1 Processing steps

```text
1. Fetch file bytes from Google Drive.
2. Send image bytes + context to AI provider.
3. Validate JSON response.
4. Clamp confidence to 0..1.
5. Validate document_type enum.
6. Validate folder key against allowed folder map.
7. Decide filing outcome.
8. Move file in Drive.
9. Rename file if confidence high.
10. Save AI result and final status.
```

## 17.2 AI prompt template

System instruction:

```text
You classify field service business documents and job photos.

Return strict JSON only.
Do not invent values.
If unsure, set needs_review=true.
Only choose a target_folder_key from the allowed list.
Do not decide accounting treatment.
```

User payload:

```text
Business: {{business_name}}
Capture context: {{job_or_general}}

If job:
Category: {{category}}
Client: {{client_name}}
Job: {{job_name}}
Address: {{address}}

Allowed folder keys:
{{allowed_folder_keys}}

Classify the attached image.
Extract basic metadata if visible.
Return strict JSON with:
document_type
target_folder_key
suggested_filename
vendor_or_party
document_date
amount
currency
invoice_number
due_date
confidence
needs_review
reason
```

## 17.3 Response validation

Reject/needs review if:

```text
invalid JSON
missing document_type
missing confidence
folder key not allowed
confidence < threshold
document_type unknown
target folder is impossible for context
```

Example impossible:

```text
capture_context=job
target_folder_key=bank_credit_card_doc
```

Should route to:

```text
Needs Review
```

---

# 18. Google Drive Operations

## 18.1 Create folder

Use Drive API to create folders.

Folder metadata:

```json
{
  "name": "01 Receipts",
  "mimeType": "application/vnd.google-apps.folder",
  "parents": ["parent_folder_id"]
}
```

## 18.2 Upload file to In-Process

Upload original file into:

```text
job /00 In-Process
```

or

```text
general /00 In-Process
```

## 18.3 Move file

Move by updating parents:

```text
remove old parent
add new parent
```

## 18.4 Rename file

Rename only if confidence high.

## 18.5 Open in Drive

Store Drive file ID and expose Drive URL in UI.

---

# 19. Security Requirements

## 19.1 OAuth scopes

Use minimum viable Drive scope.

Preferred:

```text
drive.file
```

But test whether it supports all required files/folders created by the app.

Avoid full Drive scope unless necessary.

## 19.2 Token security

Store tokens encrypted.

Requirements:

```text
encrypt refresh tokens
never expose access tokens to frontend
rotate secrets
support revoke/reconnect
```

## 19.3 Authorization

Every API request checks:

```text
user is authenticated
user has membership in business
role permits action
document belongs to business
job belongs to business
```

MVP role rules:

```text
owner_admin: full business setup, Drive connection, jobs, invitations, uploads, review
reviewer: view jobs, upload to jobs, upload general docs, review and correct documents
field_user: view active jobs and upload to active jobs only
```

MVP note:

```text
There is no job-assignment model.
Any active business member can view the business's active jobs.
```

## 19.4 File privacy

```text
No permanent app storage of documents
No public file URLs
No anonymous uploads in MVP
No cross-business access
```

## 19.5 Audit log

Log:

```text
business created
Drive connected
job created
document uploaded
AI classified
file moved
file renamed
metadata edited
document reviewed
invitation created
invitation accepted
```

---

# 20. Error Handling

## Upload failures

Show:

```text
Upload failed. Try again.
```

No document row unless Drive upload succeeded.

## AI failure

Document stays/moves to Needs Review.

Status:

```text
failed
failure_reason = ai_error
```

## Drive failure after AI

Status:

```text
failed
failure_reason = drive_move_error
```

Reviewer sees item.

## Token expired/revoked

Business status:

```text
Drive disconnected
```

Owner/Admin must reconnect.

## Folder missing/deleted

On processing:

```text
attempt recreate folder if safe
else route to Needs Review and flag drive_folder_missing
```

---

# 22. MVP Technical Architecture

## Recommended stack

### Frontend

```text
Next.js PWA
Tailwind
shadcn/ui
```

### Backend

```text
Single Next.js App Router TypeScript application for the MVP
```

Later extraction option:

```text
Next.js frontend
Fastify/NestJS backend
PostgreSQL
```

### Database

```text
Supabase Postgres or Neon Postgres
```

### File storage

```text
Owner’s Google Drive
```

### AI

```text
Gemini 2.5 Flash-Lite Vision through provider abstraction
```

### Queue

MVP choice:

```text
BullMQ + Redis
```

Later alternative:

```text
Cloud Tasks / Supabase Edge Function / QStash
```

## Recommended MVP deployment

Use one codebase with separate web and worker processes:

```text
Next.js web app on Railway/Fly.io/Render
Queue worker from the same repo on Railway/Fly.io/Render
Supabase Postgres or Neon Postgres
Redis
Gemini API
Google Drive API
```

---
