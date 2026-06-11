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

## Follow-up diagnosis: photos still over-routing to review

A second in-repo pass found two remaining likely causes when every uploaded photo still lands in `99 Needs Review`:

1. The Gemini request asked for JSON output but did not provide a response schema, so production output could still drift into schema-validation failures such as missing required nullable fields, wrong primitive types, or unsupported folder-key wording. The app intentionally converts those invalid provider outputs into `Needs Review`.
2. The prompt treated the upload primarily as a document image and told the model to review ambiguity, but it did not explicitly say that a clear job-site/progress/material photo can be confidently auto-filed to `job_photos` even when no text, date, amount, vendor, invoice number, or filename metadata is visible. That can push real job photos toward `needs_review=true`, which the backend correctly treats as a hard review signal.

The follow-up fix keeps backend routing rules unchanged but reduces avoidable review outcomes by:

1. Adding a Gemini structured-output JSON schema for the exact normalized classification fields.
2. Explicitly instructing the model that clear job photos should normally target `job_photos` and that null metadata alone is not a review reason.

## Worker failure logging follow-up

The generic `AI classification failed` warning was not enough to diagnose production failures because it omitted the underlying error object. Worker warnings now include safe error details, retry intent, attempt count, capture context, MIME type, and current Drive folder. Gemini non-2xx responses now preserve the provider status and provider message in the thrown error so backend logs can distinguish schema/request errors, auth/quota errors, transient provider errors, and local routing failures without exposing Drive tokens or image bytes.

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
