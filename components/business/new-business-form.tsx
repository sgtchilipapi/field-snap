"use client";

import { useActionState } from "react";
import { submitNewBusiness, type NewBusinessFormState } from "@/app/(app)/businesses/new/actions";
import { InlineAlert } from "@/components/ui/inline-alert";

const initialState: NewBusinessFormState = {
  error: null
};

export function NewBusinessForm() {
  const [state, formAction, pending] = useActionState(submitNewBusiness, initialState);

  return (
    <form action={formAction} className="space-y-5 rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
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
      <button
        className="rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Setting up..." : "Enter"}
      </button>
    </form>
  );
}
