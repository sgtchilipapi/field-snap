"use client";

import { useActionState, useState } from "react";
import { submitNewJob, type JobFormState } from "@/app/(app)/businesses/[businessId]/jobs/actions";
import { FormField } from "@/components/ui/form-field";
import { InlineAlert } from "@/components/ui/inline-alert";
import { cn } from "@/lib/utils";
import type { CategoryRow } from "@/lib/server/db/schema";

const initialState: JobFormState = {
  error: null
};

function getTodayForDateInput() {
  return new Date().toLocaleDateString("en-CA");
}

export function NewJobForm({
  businessId,
  categories,
  variant = "card"
}: {
  businessId: string;
  categories: CategoryRow[];
  variant?: "card" | "sheet";
}) {
  const [creatingCustomCategory, setCreatingCustomCategory] = useState(false);
  const [state, formAction, pending] = useActionState(
    submitNewJob.bind(null, businessId),
    initialState
  );
  const isSheetVariant = variant === "sheet";

  return (
    <form
      action={formAction}
      className={cn(
        "space-y-5",
        isSheetVariant
          ? ""
          : "rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 md:p-6"
      )}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="">
          <select
            className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--foreground)]"
            disabled={creatingCustomCategory}
            name="category_id"
            defaultValue=""
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label=""
          hint=""
        >
          <input
            className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--foreground)]"
            name="custom_category_name"
            onFocus={() => setCreatingCustomCategory(true)}
            onBlur={(event) => {
              if (event.currentTarget.value.trim().length === 0) {
                setCreatingCustomCategory(false);
              }
            }}
            placeholder="Specify category if not listed above."
            type="text"
          />
        </FormField>
        <FormField label="">
          <input
            className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--foreground)]"
            name="client_name"
            placeholder="Client Name"
            required
            type="text"
          />
        </FormField>
        <FormField label="">
          <input
            className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--foreground)]"
            name="job_name"
            placeholder="Job Name"
            required
            type="text"
          />
        </FormField>
        <FormField label="">
          <input
            className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--foreground)]"
            name="address"
            placeholder="Address"
            type="text"
          />
        </FormField>
        <FormField label="" hint="Job start date">
          <input
            className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--foreground)]"
            defaultValue={getTodayForDateInput()}
            name="job_date"
            required
            type="date"
          />
        </FormField>
      </div>
      {state.error ? (
        <InlineAlert title="Could not create job" description={state.error} variant="danger" />
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
          {pending ? "Creating..." : "Create job"}
        </button>
      </div>
    </form>
  );
}
