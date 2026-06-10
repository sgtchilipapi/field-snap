"use client";

import { useEffect, useId, type ReactNode } from "react";

export function MobileSheet({
  title,
  description,
  onClose,
  closeLabel,
  children
}: {
  title: string;
  description: string;
  onClose: () => void;
  closeLabel?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label={closeLabel ?? "Close sheet"}
        className="absolute inset-0 bg-[color:var(--foreground)]/35"
        onClick={onClose}
        type="button"
      />
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-[2rem] border-t border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 shadow-[0_-18px_48px_rgba(18,36,58,0.16)] md:inset-x-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-2xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[2rem] md:border md:px-6 md:pb-6"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="mt-2 text-2xl font-semibold tracking-tight" id={titleId}>
              {title}
            </h2>
            <p
              className="mt-2 text-sm leading-6 text-[color:var(--muted)]"
              id={descriptionId}
            >
              {description}
            </p>
          </div>
          <button
            className="inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-4 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
