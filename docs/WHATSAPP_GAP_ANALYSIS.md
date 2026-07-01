# Fylerr — WhatsApp Pivot Gap Analysis

## 0. Baseline

The current repo spec defines Fylerr as:

```text
A job-first, Google Drive-native document capture tool for field service businesses and their bookkeepers.
```

The current MVP goals prioritize:

```text
Google login
business creation
Google Drive connection
Drive folder template creation
PWA snap flow
Gemini classification
Drive auto-filing
Needs Review dashboard
multi-business support
bookkeeper/reviewer workflows
```

The WhatsApp pivot changes the product center of gravity.

New product center:

```text
WhatsApp capture
phone-number identity
current job memory
missing-proof detection
job summary
client-share flow
web app as secondary control room
optional Google Drive export later
```

## 1. Strategic gap summary

| Area | Current repo/spec | WhatsApp-first MVP | Gap severity |
|---|---|---|---|
| Primary interface | PWA | WhatsApp chat | Critical |
| Identity | Google account | WhatsApp phone number | Critical |
| Storage | Owner Google Drive | Fylerr-owned object storage first | Critical |
| Core value | Auto-file documents | Detect missing proof before billing | Critical |
| User | Bookkeeper/admin + field user | Owner-operator contractor | Critical |
| Capture | In-app Snap button | Native WhatsApp camera/doc scan/voice/doc upload | Critical |
| Job selection | App route/job page | Current job in chat + switch/search | High |
| Review | Needs Review dashboard | Confirmation flow + lightweight web correction | Medium |
| Sharing | Not central | Job summary + client-safe link | High |
| AI role | Classify for Drive folders | Classify proof + update missing-item checklist | High |
| Google Drive | Mandatory vault | Optional export/sync | Critical |
| Multi-business | First-class MVP | Later | Medium |
| Roles | Owner/Admin, Field User, Reviewer | Owner phone number first | Medium |

## 2. Product definition gap

### Current

The current spec says the one-line description is:

```text
A job-first, Google Drive-native document capture tool for field service businesses and their bookkeepers.
```

### Required

Replace with:

```text
A WhatsApp job assistant that saves every photo, receipt, approval, scanned document, and voice note to the right job, then tells contractors what is still missing before billing.
```

### Gap

The current product definition is too document-management oriented. It does not foreground payment risk, missing proof, or WhatsApp-native behavior.

## 3. Target user gap

### Current

Primary market is bookkeepers/accountants serving field service businesses, with contractors as the downstream client.

### Required

Primary user should be the contractor owner/operator.

```text
Owner answers calls.
Owner does site work.
Owner sends photos in WhatsApp.
Owner forgets receipts/approvals/after photos.
Owner needs proof before billing.
```

### Required change

Move bookkeepers/reviewers out of the first MVP wedge. They can become later users once the contractor has job proof flowing through Fylerr.

## 4. Onboarding gap

### Current flow

```text
Open PWA
Login with Google
Enter business name
Connect Google Drive
Create Drive root and folders
Create job
Snap/upload
```

### Required flow

```text
Tap WhatsApp link or scan QR
Send Start Fylerr
Create first job in chat
Send photo/doc/voice
Fylerr saves to current job
Fylerr shows missing items
```

### Gap

The current onboarding has too many setup steps for L1 owner-operators. Mandatory Google login and Drive setup should be removed from first-run activation.

## 5. Authentication gap

### Current

Users are keyed by Google identity and email.

### Required

Users must be keyed first by WhatsApp phone number.

```text
phone_number = primary identity
Google account = optional later
email = optional later
```

### Required tables/fields

Add or revise:

```text
users.phone_number
whatsapp_message_logs
magic_links
```

### Implementation issue

Existing invitation and membership flows assume email identity. That remains useful later but is not the primary identity for WhatsApp-first MVP.

## 6. Storage gap

### Current

The current architecture says Google Drive is the document vault and the backend should not permanently store images.

### Required

Fylerr must own default object storage for MVP because WhatsApp media must be downloaded, processed, attached to job items, and made available through job summaries/client links.

### Required storage model

```text
WhatsApp media
→ Fylerr webhook
→ Fylerr object storage
→ job item
→ job summary / client-safe link
```

### Gap severity

Critical. The current Drive-only storage principle conflicts with a WhatsApp-first capture bot.

## 7. Capture flow gap

### Current

The current spec centers on:

```text
Open job
Tap Snap
PWA opens camera
Upload original image to Google Drive
AI classifies
Move file to Drive folder
```

### Required

Use WhatsApp-native capture:

```text
User sends photo, scanned document, PDF, voice note, or text in WhatsApp.
Fylerr receives webhook.
Fylerr attaches item to current job.
Fylerr classifies proof type.
Fylerr updates missing-item checklist.
```

### Product implication

Remove `[Snap]` as a primary action. WhatsApp already has camera, gallery, voice, document upload, and document scan behavior.

## 8. Job model gap

### Current

Jobs are created from the app and include:

```text
business
job category
client name
job name
address
job date
Drive folder IDs
```

### Required

Jobs must support lightweight chat creation:

```text
job_number
title
address_or_client
job_type optional
status
current_for_user_id
```

### Missing behavior

The current model does not define:

```text
current active job per WhatsApp user
recent active job list
job switch command
job search by chat
ready_to_bill status
waiting_client_approval status
```

## 9. Document model gap

### Current

The current model uses `documents` as Drive file records with fields for Drive IDs, target folder keys, and document metadata.

### Required

Introduce or evolve toward `job_items`.

A job item can be:

```text
photo
video
PDF
scanned document
voice note
text note
approval message
receipt
```

### Required fields

```text
source = whatsapp | web | drive_import
source_message_id
storage_key
item_type
label
status = pending | accepted | rejected | needs_confirmation
transcript
extracted_text
ai_confidence
```

### Gap

The current `documents` model is too Drive-file-centric and too accounting-document-centric.

## 10. Folder system gap

### Current

The system creates Drive folders:

```text
00 In-Process
01 Receipts
02 Vendor Bills
03 Customer Invoices
04 Job Photos
05 Contracts
06 Permits
07 Change Orders
08 Equipment
99 Needs Review
```

### Required

For WhatsApp MVP, folders are not the main primitive. The main primitive is proof completeness.

Required proof types:

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

### Required change

Folder keys can survive as export structure later, but the MVP should use logical proof labels and checklist status, not folder movement as the main product behavior.

## 11. AI gap

### Current AI role

```text
classify image
extract metadata
choose Drive folder
rename/move file
route low confidence to Needs Review
```

### Required AI role

```text
classify proof type
infer job relevance
extract receipt/document details
summarize voice notes
detect likely missing proof
suggest labels
ask confirmation when uncertain
```

### Required guardrail

AI must not claim legal or compliance certainty. It should state missing proof and billing readiness only.

## 12. Missing-item logic gap

### Current

The current spec classifies and files documents, but it does not define job completeness checklists as the core product behavior.

### Required

Add checklist engine:

```text
job_type → expected proof types
job_items → satisfy checklist_items
missing items → shown after every meaningful capture
ready_to_bill → manual or checklist-based state
```

### Gap severity

Critical. Missing-item detection is the differentiation. Without it, Fylerr becomes a photo/document organizer.

## 13. WhatsApp webhook gap

### Current

No WhatsApp webhook/API layer is specified.

### Required

Add:

```text
GET /api/whatsapp/webhook
POST /api/whatsapp/webhook
whatsapp_message_logs
message idempotency
media download service
button/list reply routing
command parser
```

### Required handlers

```text
text command handler
media handler
interactive button handler
job creation state handler
switch-job handler
summary/share handler
```

## 14. Chat state gap

### Current

The current app relies on pages/routes/forms.

### Required

WhatsApp needs conversational state:

```text
awaiting_job_description
awaiting_job_address
awaiting_existing_job_search
awaiting_job_selection
awaiting_item_label
awaiting_save_confirmation
idle
```

### Required storage

Add a lightweight conversation/session state table or encode state in durable records.

Suggested:

```text
conversation_states (
  user_id,
  business_id,
  state,
  context jsonb,
  expires_at,
  updated_at
)
```

## 15. Sharing gap

### Current

The current spec does not center client sharing.

### Required

Add job summary and client-safe share links.

```text
summary command
share command
client-safe link
revocable token
client-ready WhatsApp message
```

### Important distinction

Magic login links and client share links must be separate.

## 16. Web app gap

### Current

The web app is the main product.

### Required

The web app becomes secondary.

Required MVP web views:

```text
current job page
job item list
edit label/correct wrong job
job search
client summary preview
share-link management
```

Do not prioritize:

```text
Drive settings
multi-business switcher
reviewer dashboard
folder maps
app snap camera
```

## 17. Role model gap

### Current

The spec defines:

```text
Owner/Admin
Field User
Reviewer
```

### Required

MVP can start with:

```text
owner
```

Optional later:

```text
worker
admin/reviewer
bookkeeper
```

### Gap

The current role system is more complex than needed for the WhatsApp-first wedge.

## 18. Work order gap

### Current completed work orders

The work order doc marks the following as done:

```text
WO-01 Project scaffold
WO-02 Google login
WO-03 Business creation and switcher
WO-04 Google Drive connection
WO-05 Default folder template creation
```

### Pivot implication

Those are not useless, but they are no longer the MVP spine.

| Existing work | Keep? | Pivot use |
|---|---:|---|
| Next.js scaffold | Yes | Web control room |
| Postgres | Yes | Core backend |
| Google login | Optional | Admin fallback later |
| Business model | Yes, simplify as workspace |
| Drive connection | Later | Optional export/sync |
| Folder template | Later | Export structure only |
| PWA snap | Deprioritize | Not main capture |
| Review dashboard | Later | Correction/admin view |

## 19. Revised work order sequence

### WP-01 — WhatsApp webhook spine

Build:

```text
webhook verification
incoming message persistence
idempotency
phone-number user creation
default workspace creation
basic replies
```

### WP-02 — Chat job creation

Build:

```text
new command
job description prompt
address/client prompt
job number generation
current job assignment
```

### WP-03 — Switch existing job

Build:

```text
recent active jobs
search by address/client/title/job number
numeric selection replies
current job update
```

### WP-04 — Media intake

Build:

```text
media webhook handling
media download
object storage
job_items
manual label buttons
saved confirmation
```

### WP-05 — Missing-item checklist

Build:

```text
job type templates
checklist_items
missing command
post-capture missing-item reply
ready_to_bill state
```

### WP-06 — Job summary/share

Build:

```text
summary command
client-safe share link
client-ready message
copy/share CTA
waiting_client_approval state
```

### WP-07 — Magic-link control room

Build:

```text
magic link generation
/auth/magic validation
current job page
label correction
wrong-job correction
```

### WP-08 — AI classification and moderation

Build:

```text
proof type classifier
receipt/document detector
voice transcription
content moderation
needs_confirmation/rejected states
```

### WP-09 — Optional Drive export

Build later:

```text
manual export completed job
Drive folder sync
business settings integration
```

## 20. What to delete, pause, or demote

### Delete from MVP path

```text
mandatory Drive connection before use
PWA Snap as default capture
Google login as first user action
folder creation as activation milestone
```

### Pause

```text
reviewer-first dashboard
multi-business switcher polish
invitations by email
Google Drive folder repair
complex document metadata editing
```

### Keep but demote

```text
Google login
Google Drive connection
folder templates
review screen
Drive file metadata
```

## 21. Technical migration strategy

### Do not rewrite everything

Keep:

```text
Next.js app
Postgres
env validation
test setup
business/membership foundation
server-side service structure
queue pattern
```

### Add parallel WhatsApp spine

Add new modules:

```text
src/server/integrations/whatsapp/
src/server/services/conversations/
src/server/services/jobs-current/
src/server/services/job-items/
src/server/services/checklists/
src/server/services/share-links/
src/server/auth/magic-links/
src/server/storage/
```

### Keep Drive code isolated

Do not remove Drive integration immediately. Move it behind optional export/sync use cases.

## 22. Minimum schema changes

Add:

```text
users.phone_number
jobs.job_number
jobs.title
jobs.address_or_client
jobs.job_type
jobs.current_for_user_id or separate current_jobs table
job_items
checklist_items
whatsapp_message_logs
conversation_states
magic_links
share_links
```

Consider deprecating over time:

```text
jobs.drive_folder_id required constraint
documents.original_drive_file_id required constraint
drive-first folder maps for MVP flows
```

## 23. Critical acceptance tests

### WhatsApp webhook

```text
reject invalid verification
accept valid incoming text
ignore duplicate wa_message_id
create user by phone number
create default workspace
```

### Job creation

```text
new command starts flow
job description is saved
address/client is saved
current job is switched
```

### Media intake

```text
incoming media attaches to current job
unknown media asks label
wrong/current-job uncertainty asks confirmation
```

### Missing items

```text
job type creates default checklist
accepted job item satisfies checklist item
reply includes remaining missing items
```

### Sharing

```text
summary excludes internal/rejected items
client link does not authenticate user
magic link cannot be used as client link
revoked client link stops access
```

## 24. Main risks after pivot

### Risk: wrong job assignment

Mitigation:

```text
current job in every reply
short switch flow
recent active jobs
search fallback
web correction
```

### Risk: chat clutter

Mitigation:

```text
short messages
three actions max
full command list only on help
```

### Risk: weak payment conversion

Mitigation:

```text
focus copy on payment/dispute risk
not document organization
show ready_to_bill / missing before billing
```

### Risk: unsafe/inappropriate content

Mitigation:

```text
moderation before accepted storage
pending confirmation state
rejected state
no rejected items in summaries
```

### Risk: overbuilding AI

Mitigation:

```text
rule-based checklist first
AI suggestions only
manual override always
```

## 25. Decision matrix

| Question | Decision |
|---|---|
| Should WhatsApp be the main daily UI? | Yes |
| Should Fylerr keep a web app? | Yes, secondary control room |
| Should Google Drive be required? | No |
| Should Google login be required? | No |
| Should user identity start with phone number? | Yes |
| Should Fylerr auto-send to clients? | No, prepare message only |
| Should Fylerr create one chat per job? | No, one Fylerr chat with internal job records |
| Should Fylerr use `[Snap]`? | No, use native WhatsApp capture |
| Should the MVP target bookkeepers first? | No, target owner-operators first |

## 26. Brutal conclusion

The current repo is a valid Google Drive auto-filing app foundation, but it is no longer aligned with the sharper Fylerr wedge.

The new wedge is:

```text
WhatsApp-native missing-proof detection for small contractors before billing.
```

That requires a different MVP spine:

```text
WhatsApp webhook
phone identity
current job
job items
missing-item checklist
job summary
client share link
magic-link web control room
```

Google Drive, Google login, folder templates, and reviewer dashboards should become later support features, not the first product experience.
