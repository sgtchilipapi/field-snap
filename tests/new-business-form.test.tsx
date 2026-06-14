import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewBusinessForm } from "@/components/business/new-business-form";

vi.mock("@/app/(app)/businesses/new/actions", () => ({
  submitNewBusiness: vi.fn(),
}));

describe("NewBusinessForm", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows an app dialog before business creation instead of using a native confirm", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    render(<NewBusinessForm />);

    fireEvent.change(screen.getByPlaceholderText("ABC Landscaping"), {
      target: { value: "ABC Landscaping" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create business" }).closest("form")!);

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Connect Google Drive" })).toBeInTheDocument();
    expect(
      screen.getByText("This will create a folder on your google drive named ABC Landscaping."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("lets the user cancel the Drive prompt without submitting", () => {
    const requestSubmitSpy = vi.spyOn(HTMLFormElement.prototype, "requestSubmit");
    render(<NewBusinessForm />);

    fireEvent.change(screen.getByPlaceholderText("ABC Landscaping"), {
      target: { value: "ABC Landscaping" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create business" }).closest("form")!);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "Connect Google Drive" })).not.toBeInTheDocument();
    expect(requestSubmitSpy).not.toHaveBeenCalled();
  });

  it("resubmits the form when the user accepts the Drive prompt", () => {
    const requestSubmitSpy = vi
      .spyOn(HTMLFormElement.prototype, "requestSubmit")
      .mockImplementation(() => undefined);
    render(<NewBusinessForm />);

    fireEvent.change(screen.getByPlaceholderText("ABC Landscaping"), {
      target: { value: "ABC Landscaping" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create business" }).closest("form")!);
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(requestSubmitSpy).toHaveBeenCalledTimes(1);
  });
});
