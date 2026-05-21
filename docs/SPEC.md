# Field-Snap — MVP Full Spec

## 0. Product Definition

### Product name placeholder

**Field-Snap**

### One-line description

A job-first, Google Drive-native document capture tool for field service businesses and their bookkeepers.

### Core promise

```text
Field users snap documents/photos in seconds.
The app auto-files them into the correct Google Drive job folder.
Reviewers can easily fix anything uncertain or misfiled.
```

### Primary market

Bookkeepers/accountants serving field service businesses:

```text
contractors
landscapers
cleaners
HVAC
plumbing
electrical
general trades
handymen
```

### MVP positioning

Not a QBO competitor.
Not a Hubdoc/Dext clone.
Not a full document management system.

It is:

```text
A field document intake and Google Drive auto-filing layer for bookkeepers.
```

---

# 1. MVP Goals

## Primary goals

1. Let a business owner create jobs quickly.
2. Automatically create Google Drive folder structures for jobs.
3. Let field/admin users snap photos/documents from a PWA.
4. Upload originals directly into the owner’s Google Drive.
5. Use Gemini Vision to classify the image.
6. Auto-file high-confidence uploads.
7. Route uncertain uploads to **Needs Review**.
8. Provide a simple review dashboard.
9. Support multiple businesses per user.
10. Prepare for future QBO integration without building it in MVP.

## Explicit non-goals for MVP

Do **not** build:

```text
QBO sync
bill creation
receipt matching
payment workflows
OCR pipeline
local LLM
complex accounting categorization
full document approval workflows
e-signature
crew payroll
job costing
customer portal
```

---

# 2. User Types and Roles

## MVP role model

| Role            | Description                          | Permissions                                                    |
| --------------- | ------------------------------------ | -------------------------------------------------------------- |
| **Owner/Admin** | Business owner or manager            | Manage business, Drive connection, jobs, invitations, and review uploads |
| **Field User**  | Crew/member who uploads from jobs    | Snap/upload to active jobs and view active jobs                |
| **Reviewer**    | Bookkeeper/accountant/admin reviewer | View jobs and uploads, upload general docs, correct folder/job/metadata, mark reviewed |

## Role permissions matrix

| Action                  | Owner/Admin | Field User | Reviewer |
| ----------------------- | ----------: | ---------: | -------: |
| Create business         |         Yes |         No |       No |
| Connect Google Drive    |         Yes |         No |       No |
| Create job              |         Yes |         No |       No |
| Invite users            |         Yes |         No |       No |
| Upload to active job    |         Yes |        Yes |      Yes |
| Upload general document |         Yes |         No |      Yes |
| View jobs               |         Yes |        Yes |      Yes |
| View all uploads        |         Yes |         No |      Yes |
| Review Needs Review     |         Yes |         No |      Yes |
| Change file folder      |         Yes |         No |      Yes |
| Edit metadata           |         Yes |         No |      Yes |
| Delete business         |         Yes |         No |       No |

---

# 3. Core User Flows

## 3.1 First-time owner flow

```text
1. User opens PWA.
2. User logs in with Google.
3. App asks for Business Name.
4. App creates the business record.
5. User lands on Connect Google Drive screen.
6. App requests Google Drive permission.
7. App creates the root folder and default folder template in the owner’s Google Drive.
8. User lands on Create Job screen.
```

Visible flow:

```text
Login → Business Name → Connect Drive → Create Job
```

Hidden backend flow:

```text
Create user
Create business
Create membership as Owner/Admin
Store business without Drive connection yet
Connect Google Drive
Create root Drive folder
Create default category and general folders
Store Drive folder IDs
```

---

## 3.2 Create job flow

User input:

```text
Business
Job category
Client name
Job name
Optional address
Job date (required, defaults to today)
```

Folder naming convention:

```text
Client Name - Job Name - YYYY-MM-DD
```

Example:

```text
Smith Residence - Backyard Cleanup - 2026-05-21
```

App creates:

```text
/Field-Snap - ABC Landscaping/
  /Landscaping/
    /Smith Residence - Backyard Cleanup - 2026-05-21/
      /00 In-Process/
      /01 Receipts/
      /02 Vendor Bills/
      /03 Customer Invoices/
      /04 Job Photos/
      /05 Contracts/
      /06 Permits/
      /07 Change Orders/
      /08 Equipment/
      /99 Needs Review/
```

---

## 3.3 Snap inside a job

```text
1. User opens job.
2. User taps Snap.
3. PWA opens camera.
4. User takes photo.
5. App uploads original image to Google Drive /00 In-Process.
6. Backend sends image to Gemini Vision.
7. Gemini returns classification + metadata + confidence.
8. If confidence >= threshold:
      rename file if safe
      move file to suggested folder
      mark status = Auto-filed
   Else:
      move file to /99 Needs Review
      mark status = Needs Review
9. User sees simple success state.
```

Success message:

```text
Uploaded.
```

Optional secondary detail:

```text
Filed to Receipts.
```

Do not force confirmation.

---

## 3.4 Snap general/admin document

Some documents are not job-specific:

```text
insurance
licenses
tax docs
bank statements
payroll docs
loans
general contracts
business registration
```

Flow:

```text
1. Owner/Admin or Reviewer taps General Upload.
2. User snaps photo.
3. File uploads to General /00 In-Process.
4. Gemini classifies.
5. File moves to General Business Docs folder or Needs Review.
```

Folder structure:

```text
/Field-Snap - ABC Landscaping/
  /General Business Docs/
    /00 In-Process/
    /01 Insurance/
    /02 Licenses/
    /03 Tax/
    /04 Payroll/
    /05 Bank and Credit Card/
    /06 Loans and Financing/
    /07 Contracts and Legal/
    /99 Needs Review/
```

---

## 3.5 Review flow

Reviewer opens:

```text
Review → Needs Review
```

Each item shows:

```text
thumbnail
current folder
suggested folder
document type
job/client
vendor
date
amount
confidence
uploading user
created timestamp
Open in Drive
```

Reviewer can:

```text
change job
change folder
edit metadata
mark reviewed
open file in Drive
```

Removed from MVP:

```text
re-run AI
```

---

# 4. Product Structure

## Visible navigation

For Owner/Admin:

```text
Jobs
Snap
Review
Businesses
Settings
```

For Field User:

```text
Jobs
Snap
Uploads
```

MVP note:

```text
There is no job-assignment model in MVP.
Field users can view all active jobs in the current business.
```

For Reviewer:

```text
Review
Jobs
Businesses
```

---

# 5. Business and Multi-Business Model

## Requirement

Multi-business support is first-class.

A user can belong to multiple businesses.

Example:

```text
User: bookkeeper@gmail.com

Businesses:
- ABC Landscaping
- Northside Cleaning
- Delta Plumbing
```

## Business switching

Top-level business switcher:

```text
Current Business: ABC Landscaping ▼
```

Implementation note:

```text
Current business is determined by the route context.
It is not stored as a separate hidden active-business session flag.
```

Each business has:

```text
own Drive root
own jobs
own folder map
own invited users
own upload history
own settings
```

---

# 6. Google Drive Ownership Model

## Decision

Use the **owner’s Google Drive**.

The app does not own long-term document storage.

## Why

```text
client owns records
storage burden stays with client
easier trust story
lower liability
cleaner offboarding
```

## App behavior

The app creates and manages folders inside the owner’s Drive:

```text
/Field-Snap - [Business Name]/
```

## Storage principle

```text
Google Drive is the document vault.
Your backend is the routing brain.
```

## Backend storage rule

The backend should not permanently store images.

Acceptable:

```text
process image in memory
temporary signed URL if required
short-lived processing cache if unavoidable
```

Avoid:

```text
permanent server copies
long-term R2/S3 storage
database blobs
```

---

# 7. Folder System

## 7.1 Root folder

```text
Field-Snap - [Business Name]
```

Example:

```text
Field-Snap - ABC Landscaping
```

## 7.2 Category folders

Categories are fixed defaults + custom category.

Default categories:

```text
Landscaping
HVAC
Plumbing
Electrical
Cleaning
General Contracting
Other
```

Users may add custom categories.

Examples:

```text
Pool Maintenance
Pest Control
Roofing
Painting
```

## 7.3 Job folder naming

Chosen format:

```text
Client Name - Job Name - YYYY-MM-DD
```

Examples:

```text
Smith Residence - Backyard Cleanup - 2026-05-21
Garcia Office - Weekly Cleaning - 2026-05-21
Delta Mall - HVAC Repair - 2026-05-21
```

## 7.4 Job subfolders

Each job folder gets:

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

## 7.5 General business folders

Each business root gets:

```text
General Business Docs/
  00 In-Process
  01 Insurance
  02 Licenses
  03 Tax
  04 Payroll
  05 Bank and Credit Card
  06 Loans and Financing
  07 Contracts and Legal
  99 Needs Review
```

---

# 8. Document Types

## MVP document classes

```text
receipt
vendor_bill
customer_invoice
contract
permit
change_order
job_photo
equipment_doc
insurance_doc
license_doc
tax_doc
bank_credit_card_doc
payroll_doc
loan_financing_doc
unknown
```

## Job-specific document types

```text
receipt
vendor_bill
customer_invoice
contract
permit
change_order
job_photo
equipment_doc
unknown
```

## General/admin document types

```text
insurance_doc
license_doc
tax_doc
bank_credit_card_doc
payroll_doc
loan_financing_doc
contract
unknown
```

---

# 9. AI Classification

## 9.1 Provider strategy

MVP starts with:

```text
Gemini 2.5 Flash-Lite Vision
```

But code should use provider abstraction:

```text
AIProvider.classifyDocument(image, context)
```

Later possible providers:

```text
Gemini
OpenAI
Claude
local model
```

## 9.2 AI input

Send:

```text
image
business name
job context if available
category
allowed target folders
folder map
```

Example context:

```json
{
  "business_name": "ABC Landscaping",
  "capture_context": "job",
  "job": {
    "client_name": "Smith Residence",
    "job_name": "Backyard Cleanup",
    "category": "Landscaping"
  },
  "allowed_folders": [
    "01 Receipts",
    "02 Vendor Bills",
    "03 Customer Invoices",
    "04 Job Photos",
    "05 Contracts",
    "06 Permits",
    "07 Change Orders",
    "08 Equipment",
    "99 Needs Review"
  ]
}
```

## 9.3 AI output contract

Gemini must return strict JSON:

```json
{
  "document_type": "receipt",
  "target_folder_key": "receipts",
  "suggested_filename": "Home Depot - 182.44 - 2026-05-21.jpg",
  "vendor_or_party": "Home Depot",
  "document_date": "2026-05-21",
  "amount": 182.44,
  "currency": "USD",
  "invoice_number": null,
  "due_date": null,
  "confidence": 0.93,
  "needs_review": false,
  "reason": "Image appears to be a retail purchase receipt with vendor, date, and total amount visible."
}
```

## 9.4 Required fields

| Field              | Required | Notes                             |
| ------------------ | -------: | --------------------------------- |
| document_type      |      Yes | Must match enum                   |
| target_folder_key  |      Yes | Must match allowed folder map     |
| suggested_filename | Optional | Used only when confidence is high |
| vendor_or_party    | Optional | Vendor/client/issuer              |
| document_date      | Optional | ISO format if found               |
| amount             | Optional | Number only                       |
| currency           | Optional | USD/PHP/etc.                      |
| invoice_number     | Optional | For bills/invoices                |
| due_date           | Optional | For bills/invoices                |
| confidence         |      Yes | 0 to 1                            |
| needs_review       |      Yes | Boolean                           |
| reason             |      Yes | Short explanation                 |

## 9.5 Confidence thresholds

MVP default:

```text
confidence >= 0.95 → auto-file and rename
confidence >= 0.90 and < 0.95 → auto-file but do not rename
confidence < 0.90 → Needs Review
```

Simpler version:

```text
>= 0.95 auto-file
< 0.95 Needs Review
```

Recommended MVP:

```text
>= 0.95 auto-file
< 0.95 Needs Review
```

Reason: wrong filing creates more damage than review volume.

## 9.6 No accounting treatment

AI may identify:

```text
receipt
vendor
amount
date
```

AI must not decide:

```text
expense account
tax treatment
capitalization
deductibility
payment status
QBO posting
```

---

# 10. File Naming

## Rule

Auto-rename only if confidence is high.

Chosen behavior:

```text
Rename only if confidence >= 0.95
```

## Naming templates

### Receipt

```text
Vendor - Amount - YYYY-MM-DD.jpg
```

Example:

```text
Home Depot - 182.44 - 2026-05-21.jpg
```

### Vendor bill

```text
Vendor - Invoice [InvoiceNo] - YYYY-MM-DD.jpg
```

Example:

```text
Meralco - Invoice 1042 - 2026-05-21.jpg
```

### Job photo

```text
Job Photo - YYYY-MM-DD - HHmm.jpg
```

Example:

```text
Job Photo - 2026-05-21 - 1430.jpg
```

### Contract

```text
Contract - Party - YYYY-MM-DD.jpg
```

Example:

```text
Contract - Smith Residence - 2026-05-21.jpg
```

## Unsafe filename handling

Strip or replace:

```text
/ \ : * ? " < > |
```

Maximum filename length:

```text
120 characters
```

---

# 11. Upload and Filing Lifecycle

## Document statuses

```text
uploaded_to_in_process
ai_processing
auto_filed
needs_review
reviewed
failed
```

## Lifecycle

```text
1. User snaps.
2. File uploaded to Drive /00 In-Process.
3. Document row created in DB.
4. AI processing starts.
5. AI result saved.
6. If confident:
      move Drive file to target folder
      optionally rename
      status = auto_filed
   Else:
      move Drive file to Needs Review
      status = needs_review
7. Reviewer can correct later.
```

## Failure handling

If Gemini fails:

```text
move to Needs Review
status = failed
failure_reason = ai_error
```

If Drive move fails:

```text
status = failed
file remains in In-Process
show in Review
```

If upload fails:

```text
show retry to user
do not create incomplete document row unless file exists
```

---

# 12. Review Dashboard

## Required screens

### Recent Uploads

Shows all recent files.

Columns/cards:

```text
thumbnail
document type
file status
job/general
folder
vendor/party
date
amount
uploader
created time
Open in Drive
```

### Needs Review

Filtered list:

```text
status = needs_review or failed
```

### Document Detail

Shows:

```text
image preview
current Drive location
AI suggestion
metadata fields
audit log
actions
```

## Reviewer actions

Allowed:

```text
change job
change folder
edit metadata
mark reviewed
open in Drive
```

Not in MVP:

```text
re-run AI
QBO sync
delete from Drive
bulk approve
```

## Correction behavior

When reviewer changes folder:

```text
backend moves file in Google Drive
document status = reviewed
audit log records correction
```

When reviewer changes metadata:

```text
database metadata updated
Drive file unchanged unless folder/name changed
```

---

# 13. PWA Requirements

## 13.1 Capture

Use browser camera/file input:

```html
<input type="file" accept="image/*" capture="environment">
```

MVP supports:

```text
single image upload
JPEG/PNG/HEIC if supported by browser
```

Later:

```text
multi-page capture
PDF generation
batch upload
offline queue
```

## 13.2 Mobile-first UI

Primary user is on phone.

Must support:

```text
large Snap button
minimal typing
job search
recent jobs
quick upload feedback
```

## 13.3 Upload UX

After snap:

```text
Uploading...
Uploaded.
```

Do not require user to wait for AI filing.

AI can continue after upload.

---

# 14. Authentication and Invitation

## 14.1 Login

Use Google login.

Auth record:

```text
email
name
google subject id
avatar
```

## 14.2 Invitations

Users are invited.

Flow:

```text
Owner/Admin enters email
App creates invitation
App shows a copyable invitation link
Invitee logs in with Google
If email matches invite, membership is created
```

MVP rule:

```text
Invited users must log in with Google.
```

No anonymous upload links in MVP.

## 14.3 Invitation roles

Owner/Admin can invite as:

```text
Field User
Reviewer
```

Default:

```text
Field User
```

---

# 21. MVP UI Screens

## 21.1 Login

```text
Sign in with Google
```

## 21.2 Business setup

```text
Business name
Continue
```

Behind the scenes:

```text
create business
route to Drive connection
connect Drive
create root folders
create default category folders
create General Business Docs folders
```

## 21.3 Business switcher

```text
ABC Landscaping ▼
```

## 21.4 Jobs list

Fields:

```text
search
category filter
active jobs
create job button
```

Notes:

```text
All business members can view active jobs.
Create Job is visible to Owner/Admin only.
```

Job card:

```text
Client Name
Job Name
Category
Date
Upload count
Needs Review count
```

## 21.5 Create job

Fields:

```text
Category
Client name
Job name
Address optional
Date required
```

Button:

```text
Create Job
```

## 21.6 Job detail

Actions:

```text
Snap Document
View Uploads
Open Drive Folder
```

Sections:

```text
Recent uploads
Needs review count
```

## 21.7 Snap screen

```text
Take Photo
Choose from Gallery
```

After upload:

```text
Uploaded.
```

Optional:

```text
We’ll file it automatically.
```

## 21.8 General upload screen

```text
Snap General Document
```

Visible to:

```text
Owner/Admin
Reviewer
```

Use for:

```text
insurance
tax
payroll
bank
licenses
loans
```

## 21.9 Review list

Tabs:

```text
Needs Review
Recent Uploads
Failed
```

## 21.10 Document review detail

Actions:

```text
Change Job
Change Folder
Edit Metadata
Mark Reviewed
Open in Drive
```

No re-run AI.

---

# 24. MVP Acceptance Criteria

The MVP is complete when:

```text
1. Owner can log in with Google.
2. Owner can create multiple businesses.
3. Owner can connect each business to their own Google Drive.
4. Owner can create a job.
5. Job folder and subfolders are created automatically.
6. Owner/field user can snap/upload to a job.
7. Original image is stored in Google Drive /00 In-Process first.
8. Gemini Vision classifies the image.
9. High-confidence images are moved to correct folder.
10. Low-confidence images go to Needs Review.
11. General business documents can be uploaded outside a job.
12. Reviewer can change job/folder/metadata.
13. Reviewer can mark documents reviewed.
14. Invited users can join with Google login.
15. Role permissions work.
16. Audit log exists for document actions.
```

---

# 25. Future Modules

## Phase 2

```text
multi-page capture
PDF conversion
bulk upload
offline upload queue
job assignment for field users
SMS/email upload links
bookkeeper client portal
folder template customization
```

## Phase 3

```text
QBO integration
push receipt/bill metadata to QBO
attach Drive file links to QBO transactions
bank feed matching assistant
Jobber integration
Housecall Pro integration
Dext/Hubdoc complement mode
```

## Phase 4

```text
document request workflows
missing document reminders
AI duplicate detection
job costing metadata
vendor rules
monthly bookkeeper close checklist
```

---

# 26. Biggest Product Risks

## Risk 1: Owners will not maintain jobs

Mitigation:

```text
make Create Job fast
allow General Upload
allow reviewer to assign job later
```

## Risk 2: Field users forget to select the right job

Mitigation:

```text
recent jobs
default last-used job
review correction
```

## Risk 3: AI misfiles documents

Mitigation:

```text
strict threshold
Needs Review
audit log
easy correction
no accounting posting in MVP
```

## Risk 4: Google Drive permission friction

Mitigation:

```text
clear explanation
client-owned storage
minimal scopes
visible root folder
Open in Drive links
```

## Risk 5: This becomes “just another app”

Mitigation:

The core UX must stay:

```text
open
snap
done
```

Everything else supports the reviewer/bookkeeper, not the field user.

---

# 27. Final MVP Definition

Build this first:

```text
A Google-login PWA where a field business owner creates jobs.
Each job automatically creates a Google Drive folder structure.
Field/admin users snap documents or job photos.
Images upload first into Google Drive In-Process.
Gemini Vision classifies them.
High-confidence files are auto-filed.
Uncertain files go to Needs Review.
Bookkeepers/reviewers can correct files easily.
```
