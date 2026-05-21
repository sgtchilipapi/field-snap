# Agent Instructions

You are implementing field-snap.

Always read these first:
- /docs/SPEC.md
- /docs/WORK_ORDERS.md
- /docs/ARCHITECTURE.md

Rules:
- Do not implement multiple unrelated work orders unless explicitly instructed.
- Prefer small, testable changes.
- Preserve the documented product decisions.
- Do not invent new features.
- Do not add QBO integration in MVP.
- Do not store document images permanently outside Google Drive.
- Uploaded files must go first to Google Drive /00 In-Process.
- Gemini only suggests classification; backend performs Drive actions.
- Enforce business membership and role checks on every protected API route.
- After changes, run lint/build/tests if available.
- If credentials are required, create .env.example entries and mock behavior where needed.
- Stop and summarize what changed, what was tested, and what remains.