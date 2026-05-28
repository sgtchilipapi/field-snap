# Field-Snap UI Plan

## Purpose

This document captures the current UI plan for Field-Snap.

It is a mobile-first rewrite plan for the MVP interface. The existing UI may be used as a reference for route coverage, permissions, and current component structure, but the interface should be recomposed rather than lightly adjusted.

## Global UI Direction

### Primary rule

Field-Snap is mobile-first across the entire app.

### What that means

- Mobile is the default layout, not a reduced desktop layout.
- Every page should work cleanly in a single-column flow before any tablet or desktop enhancement is added.
- Desktop improvements should be additive only.
- Existing route structure, permissions, and backend workflows stay the same unless a later decision explicitly changes them.

### Core layout principles

- Default to one column on mobile.
- Use 16px horizontal page padding on mobile.
- Stack content blocks vertically.
- Make primary actions full-width or visually dominant.
- Treat dense metadata as secondary content.
- Avoid persistent sidebars on mobile.
- Prefer short cards, sections, and sheets over wide dashboard layouts.
- Use the current product behavior as reference, but redesign the composition from scratch.

## Navigation Model

### Authenticated mobile shell

Use a hybrid mobile navigation model:

- Bottom tabs for primary repeated tasks.
- Top bar for business context and page identity.
- Overflow sheet for secondary actions.

### Bottom tabs

For `owner_admin` and `reviewer`:

- Jobs
- Review
- Upload

For `field_user`:

- Jobs

### Overflow sheet

Place these in the top-right overflow sheet:

- Business switcher
- Settings
- Businesses list
- Logout

### Desktop behavior

- Do not preserve the current sidebar-first shell as the primary pattern.
- At larger breakpoints, navigation can widen and breathe, but it should still feel like a scaled-up version of the mobile structure.

## Shared UI Rules

### Headers

- Keep page headers compact on mobile.
- Show page title and short description only when useful.
- Avoid large hero-style spacing inside authenticated pages.

### Forms

- One field per row on mobile.
- Move to two columns only at `md` and above where it improves scanability.
- Keep submit actions visible and easy to reach.
- Use a sticky CTA only on long forms where the primary action can fall out of view.

### Detail screens

- Show the task-relevant summary first.
- Move IDs, verbose technical details, and raw JSON into secondary expandable sections.
- Do not let Drive metadata dominate the first screen.

### Lists

- Use compact, thumb-friendly cards.
- Put the primary action on the card or within one tap.
- Keep filters collapsed on mobile unless the user explicitly opens them.

## Primary Mobile User Flow

### Main forward flow

1. `/login`
2. `/businesses/new` when the user has no memberships
3. `/businesses/[businessId]` route resolution
4. `/businesses/[businessId]/settings` for `owner_admin` when Drive is not connected
5. `/businesses/[businessId]/jobs` once Drive is ready, or immediately for non-owner roles
6. Job detail and snap flows from the jobs list
7. Review, document detail, upload, and settings as secondary working flows

### Route resolution rule

`/businesses/[businessId]` should not become a standalone dashboard page in the MVP.

It should continue to redirect:

- `owner_admin` without Drive connection -> `/businesses/[businessId]/settings`
- everyone else -> `/businesses/[businessId]/jobs`

### Parallel public flow

Invitation acceptance is a separate public entry flow:

1. `/invitations/[token]`
2. `/login` if sign-in is required
3. invitation acceptance
4. business landing based on membership and Drive status

## Page-by-Page Lean UI Spec

### `/login`

What page we are in:
Public sign-in entry point for unauthenticated users.

Elements and components:

- Product label: `Field-Snap`
- One short headline
- One short supporting sentence
- Primary CTA: `Sign in with Google`
- Inline alert area for sign-in errors or signed-out state

What could be removed to achieve the leanest UI:

- The current split two-panel layout
- Any extra explainer about protected routes
- Long messaging about invitations, session mechanics, or business context
- Large decorative spacing that pushes the CTA too low on mobile

Lean mobile composition:

- Product label at top
- Headline and one-sentence promise
- One dominant sign-in button
- Error or success alert directly under the button

What it should do:

- Let the user understand the app in a few seconds
- Move the user into Google sign-in with one tap
- Hand off immediately to membership-based routing after success

### `/invitations/[token]`

What page we are in:
Public invitation acceptance page.

Elements and components:

- Invitation status alert
- Business name
- Invited role
- Invited email
- Inviter identity
- Expiry timestamp
- Signed-in email, if available
- One primary action: `Sign in with Google` or `Accept invitation`

What could be removed to achieve the leanest UI:

- Large public marketing treatment
- Secondary educational copy about how invitations work
- Any extra actions besides the next required step

Lean mobile composition:

- Status alert first
- Invitation details as a tight stacked summary
- One primary CTA at the bottom

What it should do:

- Explain whether the invite is valid
- Make mismatched-email states obvious
- Give the user exactly one next step

### `/businesses/new`

What page we are in:
First business setup screen after sign-in when the user has no memberships.

Elements and components:

- Compact title
- One-sentence setup explanation
- `Business name` input
- Primary CTA: `Continue`
- Inline error state

What could be removed to achieve the leanest UI:

- Any Drive setup detail on this page
- Any mention of categories, jobs, folder templates, or invitations
- Secondary actions other than optional back navigation

Lean mobile composition:

- Title
- One short explanatory sentence
- One input
- One CTA

What it should do:

- Create the business record only
- Preserve setup momentum
- Send the owner into business routing immediately after creation

### `/businesses`

What page we are in:
Business chooser for users who belong to more than one business.

Elements and components:

- Compact page title
- Stacked business cards
- Per-card content: business name, role, Drive status
- Per-card primary action: `Open business`
- Secondary CTA: `Create another business`

What could be removed to achieve the leanest UI:

- Technical explanation about URL-scoped business context
- Verbose business metadata
- Horizontal card layouts on mobile

Lean mobile composition:

- Full-width list cards
- One clear action per card
- Create-business CTA at the bottom

What it should do:

- Help multi-business users choose quickly
- Stay out of the way when only one business exists by keeping auto-redirect behavior

### `/businesses/[businessId]`

What page we are in:
Route-level redirect only, not a visible dashboard page.

Elements and components:

- No persistent UI of its own

What could be removed to achieve the leanest UI:

- Any temptation to create a summary dashboard here

Lean mobile composition:

- None, because this route should resolve immediately

What it should do:

- Send the user straight to the correct starting page
- Avoid adding an unnecessary extra decision point

### Authenticated business shell

What page we are in:
Shared layout for all business-scoped pages.

Elements and components:

- Sticky top bar
- Current business label
- Current section or page title
- Overflow trigger
- Bottom tab bar

What could be removed to achieve the leanest UI:

- Persistent left sidebar on mobile
- Duplicated page titles
- Large decorative shell cards around the full app frame
- Multi-row navigation blocks that compete with page content

Lean mobile composition:

- Top bar with business context and overflow
- Main content area
- Bottom tab bar for primary actions

What it should do:

- Keep users oriented inside one business
- Keep navigation reachable with one hand
- Make business switching available without dominating the screen

### `/businesses/[businessId]/settings`

What page we are in:
Business setup and maintenance page.

Elements and components:

- Drive connection card
- Folder repair card when Drive is connected
- Business status and membership summary
- Open in Drive action when available
- Invitation management block for `owner_admin`

What could be removed to achieve the leanest UI:

- First-screen display of raw folder IDs
- Long explanatory copy about Google Drive internals
- Dense multi-column info panels on mobile

Lean mobile composition:

- Drive connection card first
- Repair card second when relevant
- Business info card
- Invitations card last
- Secondary technical details collapsed below the main actions

What it should do:

- Let the owner complete Drive setup quickly
- Keep Drive health understandable
- Make invitation creation available without overwhelming first-time setup

### `/businesses/[businessId]/jobs`

What page we are in:
Primary home screen for day-to-day work after setup.

Elements and components:

- Page title
- Search entrypoint
- Filter entrypoint
- Jobs list
- Primary CTA for `owner_admin`: `New job`

What could be removed to achieve the leanest UI:

- Inline create-job form above the list on mobile
- Always-open filter controls
- Excess metadata inside each job card

Lean mobile composition:

- Title row
- Collapsed search and filter entrypoints
- Scrollable job card list
- Sticky or visually dominant `New job` CTA for `owner_admin`

What it should do:

- Make job access immediate
- Keep creation available without taking over the screen
- Prioritize browse, search, and tap-through

### Create job flow

What page we are in:
Sub-flow launched from `/businesses/[businessId]/jobs`.

Elements and components:

- Full-screen sheet or dedicated mobile flow
- Inputs for category, optional custom category, client name, job name, address, and job date
- Primary CTA: `Create job`
- Inline validation and error state

What could be removed to achieve the leanest UI:

- Non-essential folder-tree explanation
- Side-by-side fields on small screens
- Supporting text that repeats what placeholders already explain

Lean mobile composition:

- One field per row
- Clear section order from most important to least important
- Primary CTA pinned near the bottom when the keyboard is closed if needed

What it should do:

- Let `owner_admin` create a job quickly from the job list context
- Preserve confidence that the Drive structure will be created automatically

### `/businesses/[businessId]/jobs/[jobId]`

What page we are in:
Job detail and action page.

Elements and components:

- Job summary
- Primary CTA: `Snap` when job is active
- Secondary CTA: `Open in Drive`
- Archive action for `owner_admin` when active
- Folder structure section
- Secondary Drive details section

What could be removed to achieve the leanest UI:

- Large blocks of raw folder IDs near the top
- Equal visual weight for metadata and primary actions
- Wide multi-column information grids on mobile

Lean mobile composition:

- Job name and status
- Primary action row
- Compact job facts
- Folder structure below
- Technical Drive details collapsed at the end

What it should do:

- Help users understand the current job quickly
- Push active jobs toward capture/upload
- Keep archive and Drive access available without competing with `Snap`

### `/businesses/[businessId]/jobs/[jobId]/snap`

What page we are in:
Focused job capture and upload page.

Elements and components:

- Job context label
- One file input with capture support
- One primary CTA: `Upload image`
- Upload status alert
- Short note about `00 In-Process`

What could be removed to achieve the leanest UI:

- Extra side content panels
- Long background-processing explanations
- Secondary navigation clutter beyond a simple back action

Lean mobile composition:

- Title
- File input
- Upload CTA
- Status alert
- One short supporting note

What it should do:

- Make capture/upload the only focus
- Confirm the file goes to `00 In-Process` first
- Return the user to confidence quickly with a simple uploaded state

### `/businesses/[businessId]/upload-general`

What page we are in:
Business-level upload page outside job context.

Elements and components:

- Page title
- One file input with capture support
- One primary CTA
- Upload status alert
- Short guidance about what belongs here
- Short note about `General Business Docs / 00 In-Process`

What could be removed to achieve the leanest UI:

- Side explanatory panel
- Long examples list
- Any job-related UI here

Lean mobile composition:

- Same structure as the snap page
- One guidance block above or below the input

What it should do:

- Support reviewer and owner general uploads quickly
- Keep the distinction between job uploads and business uploads obvious

### `/businesses/[businessId]/review`

What page we are in:
Review triage list for uploads that need attention or confirmation.

Elements and components:

- View switcher: `Needs Review`, `Recent Uploads`, `Failed`
- Compact document cards
- Thumbnail
- Filename
- Status
- Current folder
- Confidence
- One tap into detail

What could be removed to achieve the leanest UI:

- Large metadata grids on the list page
- Too many inline actions per card
- Full audit details inside the list

Lean mobile composition:

- View switcher first
- Tight document cards optimized for scanability
- One primary navigation path into document detail

What it should do:

- Help reviewers triage quickly
- Surface the right next document without extra decision fatigue
- Reserve deep editing for the detail screen

### `/businesses/[businessId]/documents/[documentId]`

What page we are in:
Document review and correction detail page.

Elements and components:

- Back to review action
- Open in Drive action
- Document preview
- Current state summary
- AI suggestion summary
- Review correction form
- Audit history

What could be removed to achieve the leanest UI:

- First-screen raw JSON
- Side-by-side desktop-heavy preview/editor layout on mobile
- Equal emphasis on every metadata field

Lean mobile composition:

- Top actions
- Large preview
- Current state summary
- AI suggestion summary
- Review correction form as the primary working block
- Audit history and raw payloads below, collapsed or visually de-emphasized

What it should do:

- Let the reviewer confirm or correct the destination quickly
- Keep mark-reviewed close to the form
- Preserve audit visibility without letting it obstruct the main task

## Implementation Method

The UI rewrite should be implemented in this order:

1. Global foundation first
2. Page-by-page flow implementation second
3. Larger-screen enhancement last

### 1. Global foundation first

Before editing individual pages, update the shared UI system:

- Global spacing and mobile layout rules in `app/globals.css`
- Public layout primitives
- Authenticated business shell
- Top bar
- Bottom tab navigation
- Overflow sheet behavior
- Shared page header pattern
- Shared card, form, button, and input sizing rules

Reason:

- The app repeats the same shell and spacing patterns across many routes.
- If page work starts before the global primitives are corrected, the same layout work will be repeated and then reworked.

### 2. Page-by-page flow implementation second

After the shared primitives are stable, rebuild pages in user-flow order.

Recommended order:

1. Public flow
2. Owner setup flow
3. Core work flow
4. Review flow

Public flow:

- `/login`
- `/invitations/[token]`
- `/businesses/new`
- `/businesses`

Owner setup flow:

- `/businesses/[businessId]` route resolution behavior
- `/businesses/[businessId]/settings`

Core work flow:

- `/businesses/[businessId]/jobs`
- Create job flow
- `/businesses/[businessId]/jobs/[jobId]`
- `/businesses/[businessId]/jobs/[jobId]/snap`
- `/businesses/[businessId]/upload-general`

Review flow:

- `/businesses/[businessId]/review`
- `/businesses/[businessId]/documents/[documentId]`

For each page, use the same sequence:

1. Remove non-essential elements
2. Recompose into a single-column mobile layout
3. Make the primary action dominant
4. Move technical or secondary content lower on the page or into collapsed sections
5. Only then add wider-screen expansion if needed

### 3. Larger-screen enhancement last

Tablet and desktop layouts should be additive.

- Do not design the desktop layout first and compress it into mobile.
- Do not reintroduce a desktop-first shell pattern.
- Expand width, spacing, and side-by-side sections only after the mobile version is correct.

### Implementation rule

This rewrite should not be executed as isolated page styling changes.

It should be executed as:

- shared mobile-first foundation
- then page-by-page rebuild in flow order
- then larger-screen enhancement

This order is required so the UI can be implemented in one pass without redoing the same structure multiple times.

## Implementation Sequence

### Phase 1

Replace shared layout primitives first:

- `PublicLayout`
- `AppShell`
- `BusinessNav`
- `PageHeader`
- Shared spacing and card rules in global styles

### Phase 2

Recompose public and onboarding pages:

- Login
- Invitation accept
- Business creation
- Business chooser

### Phase 3

Recompose the authenticated shell and owner setup flow:

- Business shell
- Business route resolution behavior
- Settings
- Invitations

### Phase 4

Recompose the day-to-day work flows:

- Jobs list
- New job flow
- Job detail
- Snap
- General upload

### Phase 5

Recompose the review flows:

- Review list
- Document detail

### Phase 6

Add larger-screen enhancements only after mobile layouts are stable.

## Validation

After implementation:

- Verify manually at `320`, `375`, `768`, and `1024` widths.
- Check long business names, long filenames, and dense review states.
- Confirm role-based navigation visibility.
- Confirm primary actions remain reachable with one hand on mobile.
- Run `npm run test`
- Run `npm run lint`
- Run `npm run build`

## Constraints

- Do not invent new MVP features.
- Do not change the documented route structure without explicit decision.
- Do not alter backend permissions or business rules as part of this UI work.
- Do not add QBO integration.
- Do not change the rule that uploads go to `00 In-Process` first.
- Do not change the rule that Gemini suggests classification while the backend performs Drive actions.
