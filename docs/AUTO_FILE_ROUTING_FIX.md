# Auto-File Routing Fix

## Summary

Field-Snap was routing too many valid uploads into `99 Needs Review` because the in-repo routing logic was stricter and less observable than intended.

This fix prioritizes internal causes first:

```text
1. Lower the auto-file threshold to 0.90.
2. Keep auto-rename at 0.95.
3. Treat needs_review=true as a hard review signal.
4. Preserve raw AI output and persist clearer invalid-output reasons.
5. Record routing reason codes in audit metadata and structured logs.
```

External model changes remain a follow-up only if review volume is still too high after these patches ship.

## Confirmed in-repo causes

1. The worker only auto-filed at `confidence >= 0.95`, which pushed many otherwise valid classifications into review.
2. The AI prompt example used a confidence below the auto-file cutoff, which created prompt-policy drift.
3. The worker ignored `classification.needs_review` when deciding whether to auto-file.
4. Invalid JSON, schema failures, and unsupported folder keys were collapsed into generic review reasons, making diagnosis slower.

## Implemented policy

```text
confidence >= 0.95 -> auto-file and allow rename
confidence >= 0.90 and < 0.95 -> auto-file without rename
confidence < 0.90 -> Needs Review
needs_review = true -> Needs Review
target_folder_key = needs_review -> Needs Review
```

## Routing diagnostics

The worker should emit a routing reason for every AI classification:

```text
auto_filed
review_low_confidence
review_model_requested_review
review_invalid_output
review_unsupported_folder
review_needs_review_target
review_missing_target_folder
```

These reasons should appear in:

1. `document.ai_classified` audit metadata
2. Worker structured logs
3. `documents.ai_reason` when the AI output is invalid or unusable

## Verification

Run:

```text
npm run test
npm run lint
npm run build
```

Then verify:

1. A `0.93` receipt auto-files without rename.
2. A `0.98` receipt auto-files and may rename if the filename sanitizes safely.
3. A high-confidence result with `needs_review=true` routes to review.
4. Invalid JSON, schema failures, and unsupported folder keys route to review with distinct reasons.
5. Reviewable documents retain AI metadata needed for correction.

## Deferred external follow-up

Only if review volume remains high after this fix:

1. Compare the current Gemini model against a stronger model on the same image set.
2. Revisit prompt examples with production samples from blurred, cropped, or low-light field captures.
