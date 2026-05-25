"use client";

import { useActionState, useState } from "react";
import { submitNewJob, type JobFormState } from "@/app/(app)/businesses/[businessId]/jobs/actions";
import { FormField } from "@/components/ui/form-field";
import { InlineAlert } from "@/components/ui/inline-alert";
import type { CategoryRow } from "@/lib/server/db/schema";

const initialState: JobFormState = {
  error: null
};

function getTodayForDateInput() {
  return new Date().toLocaleDateString("en-CA");
}

export function NewJobForm({
  businessId,
  categories
}: {
  businessId: string;
  categories: CategoryRow[];
}) {
  const [creatingCustomCategory, setCreatingCustomCategory] = useState(false);
  const [state, formAction, pending] = useActionState(
    submitNewJob.bind(null, businessId),
    initialState
  );

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Category">
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
          label="Custom category"
          hint="Use this only if the job belongs in a new category folder."
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
            placeholder="Roofing"
            type="text"
          />
        </FormField>
        <FormField label="Client name">
          <input
            className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--foreground)]"
            name="client_name"
            placeholder="Smith Residence"
            required
            type="text"
          />
        </FormField>
        <FormField label="Job name">
          <input
            className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--foreground)]"
            name="job_name"
            placeholder="Backyard Cleanup"
            required
            type="text"
          />
        </FormField>
        <FormField label="Address">
          <input
            className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--foreground)]"
            name="address"
            placeholder="123 Main St"
            type="text"
          />
        </FormField>
        <FormField label="Job date">
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
      <button
        className="rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Creating..." : "Create job"}
      </button>
    </form>
  );
}
