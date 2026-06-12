# Recent Open Tracking Plan

## Goal

Track the most recently opened businesses and jobs per user. After login, send a returning user with business memberships directly to the Jobs list page for their most recently opened business. On the Jobs list, order jobs by most recently opened first, with newly created or never-opened jobs after that by creation time.

## Checklist

- [x] Add persistence for per-user business and job open recency.
- [x] Add data-layer helpers to record business/job opens and fetch the most recently opened business.
- [x] Update post-login routing to prefer the user's most recently opened business Jobs list page.
- [x] Record business opens from business-scoped app routes after membership authorization.
- [x] Record job opens from job detail routes after membership authorization.
- [x] Sort job lists by per-user recent-open time first, then creation time.
- [x] Add or update tests for routing, tracking helpers, and job ordering behavior.
- [x] Run lint/build/tests and update this checklist as tasks complete.
