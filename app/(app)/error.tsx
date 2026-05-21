"use client";

import { ErrorPanel } from "@/components/ui/error-panel";

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <ErrorPanel
        title="This workspace could not load"
        description={error.message || "Field-Snap could not render the protected view."}
        actionLabel="Retry"
        onAction={reset}
      />
    </div>
  );
}

