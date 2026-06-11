"use client";

import { ErrorPanel } from "@/components/ui/error-panel";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center px-6 py-12">
        <ErrorPanel
          title="Fylerr hit a startup problem"
          description={error.message || "The application could not finish rendering."}
          actionLabel="Try again"
          onAction={reset}
        />
      </body>
    </html>
  );
}

