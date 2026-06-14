"use client";

import type { FormEvent } from "react";
import { useActionState } from "react";
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
  const isSheetVariant = variant === "sheet";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const businessName = String(formData.get("name") ?? "").trim();
    const confirmed = window.confirm(
      `This will create a folder on your google drive named ${businessName || "<Business Name>"}.`
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form
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
  );
}
