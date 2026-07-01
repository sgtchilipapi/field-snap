# Fylerr — WhatsApp-First MVP Spec

## 0. Product decision

Fylerr pivots from a web-app-first, Google Drive-native capture tool into a WhatsApp-first job completeness assistant for small contractors.

Daily use should happen in WhatsApp. The web app becomes the control room for review, correction, search, sharing settings, and admin tasks.

## 1. One-line description

Fylerr is a WhatsApp job assistant that saves every photo, receipt, approval, scanned document, and voice note to the right job, then tells contractors what is still missing before billing.

## 2. Core promise

```text
Send job proof to Fylerr on WhatsApp.
Fylerr remembers the current job.
Fylerr checks what is still missing.
Fylerr prepares a job summary the contractor can share with the client.
```

## 3. Primary market

Owner-operated and small Singapore contractors, especially:

```text
renovation / interior works
electrical
aircon / HVAC
cleaning
handyman / mixed-service contractors
```

The user is assumed to be phone-first, WhatsApp-first, and often working on site. The MVP should not depend on laptop behavior, Google Drive setup, or a structured dashboard habit.

## 4. Positioning

### Do not position as

```text
photo folder app
document organizer
Google Drive auto-filer
bookkeeper intake tool
field service management system
```

### Position as

```text
job completeness assistant
missing-proof checker
WhatsApp job memory
billing-readiness checker
payment/dispute risk prevention layer
```

### User-facing line

```text
Fylerr checks every job for missing photos, receipts, approvals, and proof before they delay billing.
```

## 5. MVP goals

1. Let a contractor start Fylerr from a WhatsApp link or QR code.
2. Use the WhatsApp phone number as the primary user identity.
3. Create a lightweight workspace automatically on first use.
4. Let the user create a job through chat.
5. Maintain one current active job per user/workspace.
6. Accept WhatsApp photos, videos, scanned documents, PDFs, text, and voice notes.
7. Attach incoming proof to the current job when safe.
8. Ask for confirmation when the target job or content type is uncertain.
9. Classify items into practical proof labels.
10. Maintain a missing-item checklist per job type.
11. Reply with the current job, missing items, and next actions.
12. Generate a job summary.
13. Generate a client-ready share message and client-safe link.
14. Open the web app through a short-lived magic link.
15. Keep Google Drive optional, not mandatory.

## 6. Explicit non-goals for MVP

Do not build:

```text
Google Drive-first onboarding
mandatory Google login
native mobile app
full project management
staff scheduling
invoice creation
payment collection
client auto-messaging
complex CRM
formal legal/compliance certification
multi-business workspace switching
full WhatsApp Flow dashboard
Google Drive sync as required storage
```

## 7. Interface model

### Main interface

```text
WhatsApp chat with Fylerr
```

### Secondary interface

```text
Fylerr web app
```

Use the web app only for:

```text
full job view
wrong-label correction
old job search
share-link settings
client-safe summary preview
billing-readiness review
exports
subscription/billing
optional Google Drive export/sync
```

## 8. WhatsApp interaction principles

1. No sticky buttons are available in WhatsApp.
2. Every meaningful reply should show the current job.
3. Do not show every command every time.
4. Show only the next two or three useful actions.
5. Keep messages short and operational.
6. Never make the bot sound cute, chatty, or apologetic.
7. Always confirm where proof was saved.

### Default reply structure

```text
Saved to:
#1042 — Tampines sink repair

Missing:
- Receipt
- Client approval

[Switch job] [Job summary] [Open app]
```

## 9. First-use flow

### Entry points

```text
WhatsApp click-to-chat link
QR code
website CTA
click-to-WhatsApp ad
saved contact
```

### First message

```text
User:
Start Fylerr

Fylerr:
I help you remember job photos, receipts, approvals, and missing items before billing.

Create your first job?

[New job] [How it works]
```

## 10. Account and workspace model

### MVP rule

```text
One WhatsApp phone number = one user identity.
One user identity = one default workspace.
```

Do not separate businesses by trade. A contractor may do cleaning, renovation, electrical, and aircon work under one number.

### Later upgrade

```text
One phone number can own or access multiple workspaces.
```

Not MVP.

## 11. Job creation flow

Ask for the minimum information needed to create a usable job record.

```text
Fylerr:
Job description?

User:
Tampines sink repair

Fylerr:
Address or client name?

User:
52 Tampines St 21

Fylerr:
Created and switched to:
#1042 — Tampines sink repair
52 Tampines St 21

Send photos, receipts, approvals, scanned documents, voice notes, or PDFs here.
```

Optional job type can be inferred first and confirmed later.

## 12. Current job rule

Every incoming item is attached to the current active job unless Fylerr is uncertain.

### Safe default

```text
User sends photo.

Fylerr:
Saved to:
#1042 — Tampines sink repair

What is this?

[Before] [After] [Receipt]
```

### If classification is confident

```text
This looks like an after photo.

Saved as:
After photo — #1042 Tampines sink repair

Missing:
- Receipt
- Client approval

[Switch job] [Job summary] [Open app]
```

### If target/content is uncertain

```text
This may not be job-related.

Save to:
#1042 — Tampines sink repair?

[Save] [Ignore] [Switch job]
```

## 13. Switching jobs

### Switch entry

```text
Fylerr:
Switch job:

[New job] [Existing job]
```

### Existing job selection

Never show all jobs. Show recent active jobs first.

```text
Recent active jobs:

1. #1042 — Tampines sink repair
2. #1041 — Bedok socket replacement
3. #1040 — Jurong aircon servicing
4. #1039 — Woodlands cabinet repair
5. #1038 — Yishun toilet leak

Reply number, or type search.
```

### Search fallback

```text
Fylerr:
Find job by address, client, job name, or job number.

User:
Tampines

Fylerr:
Found 4 jobs:

1. #1042 — Tampines sink repair — 52 Tampines St 21
2. #1037 — Tampines aircon leak — Blk 811 Tampines Ave 4
3. #1028 — Tampines light repair — Blk 230 Tampines St 24
4. #1019 — Tampines toilet repair — Blk 91 Tampines Ave 1

Reply 1–4.
```

## 14. Job states

```text
active
ready_to_bill
waiting_client_approval
closed
archived
```

Default WhatsApp lists should show only active and recently used jobs.

## 15. Proof item labels

MVP proof labels:

```text
before_photo
after_photo
progress_photo
receipt
approval
variation_approval
invoice
quote
voice_note
site_note
scanned_document
other
```

## 16. Missing-item logic

This is the core differentiation. Storage is not the product. Missing-proof detection is the product.

### Renovation / interior works

```text
before_photo
after_photo
receipt or material invoice
variation_approval if scope changed
client_approval
```

### Electrical

```text
issue_photo
after_photo
parts_receipt if parts used
client_approval
```

### Aircon / HVAC

```text
unit_photo
before_or_issue_photo
after_photo
parts_receipt if parts used
service_note
client_approval
```

### Cleaning

```text
before_photo
after_photo
attendance_or_time_note
client_approval
```

Start rule-based. Use AI only to classify and suggest. Do not present AI output as legal or compliance certainty.

## 17. Job summary

Use `Job summary`, not `Proof pack`.

### Summary command

```text
User:
summary

Fylerr:
#1042 — Tampines sink repair
52 Tampines St 21

Saved:
- 2 before photos
- 3 after photos
- 1 receipt
- 1 voice note

Missing:
- Client approval

[Share] [Ready to bill] [Open app]
```

## 18. Sharing

Fylerr should not auto-send to clients in the MVP.

Fylerr prepares the message. The contractor sends it using native WhatsApp share/forward.

### Share flow

```text
User taps:
[Share]

Fylerr:
Client message:

Hi, work at 52 Tampines St 21 is completed.

Photos and job summary:
https://fylerr.com/j/1042-client

Please confirm if everything looks good.

[Copy message] [Open WhatsApp share] [Back]
```

### Client link requirements

Client links must:

```text
hide internal notes
hide contractor cost data
show only client-safe proof
require no login
be revocable
optionally expire
show created/uploaded timestamps
be separate from login magic links
```

## 19. Magic link login

The web app opens from WhatsApp using a short-lived magic link.

```text
WhatsApp [Open app]
→ backend creates one-time token
→ user opens /auth/magic?t=token
→ backend validates token hash
→ backend creates normal web session
→ backend marks token used
→ user lands on current job
```

Security requirements:

```text
random opaque token
hash token in database
single-use
5–15 minute expiry
HTTPS only
HttpOnly secure session cookie
separate login links from client links
```

## 20. Storage decision

MVP storage should be Fylerr-owned object storage, not Google Drive.

```text
WhatsApp media
→ Fylerr webhook
→ temporary private object
→ moderation/classification
→ accepted job item storage
→ job summary/client link
```

Google Drive becomes optional export/sync later.

## 21. Moderation and relevance filtering

Do not automatically accept every incoming item.

Pipeline:

```text
incoming WhatsApp message/media
→ temporary private storage
→ moderation
→ job relevance check
→ classify
→ attach / ask / reject
```

Handling:

| Content | MVP action |
|---|---|
| Normal job photo | Save |
| Receipt/document | Save or ask label |
| Voice note | Save as note; transcription later |
| Unclear image | Ask confirmation |
| Personal/private-looking image | Ask before saving |
| Nude/sexual image | Reject |
| Threats/abuse | Do not engage; log/flag |
| Spam/flooding | Rate-limit |

User-facing rejection:

```text
This file cannot be saved to a job.

Send job photos, receipts, approvals, notes, or work documents only.
```

## 22. MVP commands

```text
new
jobs
switch
summary
share
missing
close
help
```

## 23. Data model changes

### users

Add phone identity.

```sql
users (
  id uuid primary key,
  phone_number text unique,
  google_sub text unique,
  email text unique,
  name text,
  avatar_url text,
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

For WhatsApp-first MVP, `phone_number` is required for WhatsApp-created users. Google identity is optional.

### workspaces

Rename or alias `businesses` conceptually as `workspaces` later. The existing table can remain `businesses` temporarily.

Add:

```sql
businesses (
  id uuid primary key,
  name text,
  owner_user_id uuid references users(id),
  default_trade_types text[],
  drive_root_folder_id text,
  general_docs_folder_id text,
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

### jobs

Add WhatsApp-first state fields.

```sql
jobs (
  id uuid primary key,
  business_id uuid references businesses(id),
  job_number bigint not null,
  title text not null,
  address_or_client text,
  job_type text,
  status text not null,
  current_for_user_id uuid references users(id),
  created_by_user_id uuid references users(id),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  closed_at timestamptz,
  unique (business_id, job_number)
)
```

### job_items

Add a new table or evolve `documents` into job items.

```sql
job_items (
  id uuid primary key,
  business_id uuid references businesses(id),
  job_id uuid references jobs(id),
  uploaded_by_user_id uuid references users(id),
  source text not null, -- whatsapp, web, drive_import
  source_message_id text,
  storage_key text,
  mime_type text,
  file_size_bytes bigint,
  item_type text,
  label text,
  status text not null, -- pending, accepted, rejected, needs_confirmation
  transcript text,
  extracted_text text,
  ai_confidence numeric(5,4),
  ai_reason text,
  ai_raw_response jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

### checklist_items

```sql
checklist_items (
  id uuid primary key,
  job_id uuid references jobs(id),
  proof_type text not null,
  required boolean not null default true,
  status text not null, -- missing, satisfied, waived
  satisfied_by_job_item_id uuid references job_items(id),
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

### whatsapp_message_logs

```sql
whatsapp_message_logs (
  id uuid primary key,
  user_id uuid references users(id),
  business_id uuid references businesses(id),
  wa_message_id text unique,
  direction text not null,
  message_type text not null,
  raw_payload jsonb,
  processed_at timestamptz,
  created_at timestamptz not null
)
```

### magic_links

```sql
magic_links (
  id uuid primary key,
  user_id uuid references users(id),
  job_id uuid references jobs(id),
  token_hash text unique not null,
  purpose text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null
)
```

### share_links

```sql
share_links (
  id uuid primary key,
  job_id uuid references jobs(id),
  token_hash text unique not null,
  audience text not null, -- client
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null
)
```

## 24. API surface

### WhatsApp webhook

```text
GET /api/whatsapp/webhook
POST /api/whatsapp/webhook
```

Responsibilities:

```text
verify webhook challenge
validate webhook signature if configured
log incoming message id
ensure idempotency
route text/media/button/list replies
```

### Magic link

```text
POST /api/auth/magic-links
GET /auth/magic?t=token
```

### Job APIs for web control room

```text
GET /api/jobs
GET /api/jobs/:jobId
PATCH /api/jobs/:jobId
GET /api/jobs/:jobId/items
PATCH /api/job-items/:itemId
POST /api/jobs/:jobId/share-links
POST /api/jobs/:jobId/ready-to-bill
```

## 25. Background workers

MVP workers:

```text
whatsapp_media_download_worker
content_moderation_worker
proof_classification_worker
checklist_update_worker
summary_generation_worker
```

Do not block webhook response on heavy AI work.

## 26. Build order

### WP-01 — WhatsApp spine

```text
webhook verification
incoming message logging
phone-number user creation
default workspace creation
basic text replies
idempotency by WhatsApp message id
```

### WP-02 — Job creation and current job

```text
new job command
job description/address collection
job_number generation
current job per user
switch job
recent active jobs
search fallback
```

### WP-03 — Media intake

```text
receive media webhook
download media
store object
create job_item
reply with saved/current job
manual label buttons
```

### WP-04 — Missing-item checker

```text
job type templates
checklist_items
missing command
post-capture missing items
manual satisfied/waived states
```

### WP-05 — Job summary and sharing

```text
summary command
client-safe share link
client-ready message
copy/share flow
ready_to_bill status
```

### WP-06 — Magic-link web control room

```text
one-time magic links
current job page
edit labels
job search
client-safe preview
```

### WP-07 — Intelligence layer

```text
image classification
receipt/document detection
voice note transcription
confidence thresholds
confirmation flow
moderation/rejection
```

### WP-08 — Optional Drive export

```text
connect Google Drive
export completed job folder
manual sync only
no required Drive onboarding
```

## 27. MVP acceptance criteria

A new contractor can:

1. Open Fylerr from a WhatsApp link.
2. Create a first job through chat.
3. Send a photo or scanned document through WhatsApp.
4. See confirmation that it was saved to the current job.
5. See what is still missing.
6. Switch to another job without opening the web app.
7. Generate a job summary.
8. Generate a client-ready share message.
9. Open the web app through a magic link only when needed.

## 28. Success metrics

### Activation

```text
first WhatsApp message sent
first job created
first media item saved
time from start to first saved proof
```

### Habit

```text
jobs created per user per week
media items per job
repeat use after first job
switch-job usage
```

### Value

```text
jobs with missing items detected
job summaries generated
client messages shared
jobs marked ready_to_bill
```

### Risk

```text
wrong-job correction rate
classification correction rate
unsafe content rejection rate
web app fallback rate
```

## 29. Biggest risks

### Wrong current job

If Fylerr saves proof to the wrong job, trust collapses.

Mitigation:

```text
always show current job
short switch flow
recent active jobs
search fallback
manual correction in web app
```

### Chat clutter

If every reply becomes long, contractors stop reading.

Mitigation:

```text
short replies
current job + missing items + 2–3 actions only
full command list only on help
```

### Weak differentiation

If Fylerr becomes photo folders, it competes with existing photo documentation tools.

Mitigation:

```text
prioritize missing-item logic
job summary
ready-to-bill status
client-safe share links
```

### Google Drive friction

Mandatory Drive onboarding fights the WhatsApp-first wedge.

Mitigation:

```text
Fylerr-owned storage first
Drive export optional later
```

## 30. Strategic summary

The MVP should prove one behavior:

```text
A contractor can run job proof through WhatsApp, and Fylerr reliably tells him what is missing before billing.
```

Everything else is secondary.
