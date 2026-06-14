"use client";

import React from "react";
import type { FormEvent } from "react";
import { useActionState, useRef, useState } from "react";
import { submitNewBusiness, type NewBusinessFormState } from "@/app/(app)/businesses/new/actions";
import { InlineAlert } from "@/components/ui/inline-alert";
import { cn } from "@/lib/utils";

const initialState: NewBusinessFormState = {
  error: null
};

export function NewBusinessForm({
  variant = "card"
}: {
  variant?: "card" | "sheet";
}) {
  const [state, formAction, pending] = useActionState(submitNewBusiness, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedSubmitRef = useRef(false);
  const [pendingBusinessName, setPendingBusinessName] = useState("");
  const [showDrivePrompt, setShowDrivePrompt] = useState(false);
  const isSheetVariant = variant === "sheet";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirmedSubmitRef.current) {
      confirmedSubmitRef.current = false;
      return;
    }

    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const businessName = String(formData.get("name") ?? "").trim();
    setPendingBusinessName(businessName || "<Business Name>");
    setShowDrivePrompt(true);
  }

  function handleConfirmDrivePrompt() {
    confirmedSubmitRef.current = true;
    setShowDrivePrompt(false);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className={cn(
          "space-y-5",
          isSheetVariant
            ? ""
            : "rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6"
        )}
        onSubmit={handleSubmit}
      >
        <div className="space-y-0">
          {/* <label className="text-sm font-medium" htmlFor="business-name">
            Business name
          </label> */}
          <input
            className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--foreground)]"
            id="business-name"
            name="name"
            placeholder="ABC Landscaping"
            required
            type="text"
          />
        </div>
        {state.error ? (
          <InlineAlert title="Could not create business" description={state.error} variant="danger" />
        ) : null}
        <div
          className={cn(
            isSheetVariant
              ? "sticky bottom-0 -mx-4 border-t border-[color:var(--border)] bg-[color:var(--surface-strong)]/96 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur md:-mx-6 md:px-6"
              : ""
          )}
        >
          <button
            className="w-full rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            disabled={pending}
            type="submit"
          >
            {pending ? "Setting up..." : "Create business"}
          </button>
        </div>
      </form>

      {showDrivePrompt ? (
        <div
          aria-labelledby="drive-permission-dialog-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-2xl">
            <h2 className="text-lg font-semibold" id="drive-permission-dialog-title">
              Connect Google Drive
            </h2>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              This will create a folder on your google drive named {pendingBusinessName}.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-full border border-[color:var(--border)] px-5 py-2.5 text-sm font-medium transition hover:bg-[color:var(--surface-strong)]"
                onClick={() => setShowDrivePrompt(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-full bg-[color:var(--foreground)] px-5 py-2.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                disabled={pending}
                onClick={handleConfirmDrivePrompt}
                type="button"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
