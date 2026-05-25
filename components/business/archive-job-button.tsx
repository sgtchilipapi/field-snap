"use client";

import { useState } from "react";

export function ArchiveJobButton({
  businessId,
  jobId
}: {
  businessId: string;
  jobId: string;
}) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action={`/api/businesses/${businessId}/jobs/${jobId}/archive`}
      method="post"
      onSubmit={() => setSubmitting(true)}
    >
      <button
        className="rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)] disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Archiving..." : "Archive job"}
      </button>
    </form>
  );
}
