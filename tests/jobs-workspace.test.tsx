import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JobsWorkspace } from "@/components/business/jobs-workspace";

vi.mock("@/components/business/job-list", () => ({
  JobList: () => <div>Job list</div>,
}));

vi.mock("@/components/business/new-job-form", () => ({
  NewJobForm: () => <div>New job form</div>,
}));

vi.mock("@/components/ui/mobile-sheet", () => ({
  MobileSheet: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: string;
  }) => (
    <div role="dialog" aria-label={title}>
      {children}
    </div>
  ),
}));

const defaultProps = {
  businessId: "business-1",
  canCreateJob: true,
  canViewSettings: true,
  categories: [],
  jobs: [],
};

describe("JobsWorkspace", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows the Drive connection dialog before creating a job when Drive is disconnected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ connected: false }),
      }),
    );

    render(<JobsWorkspace {...defaultProps} initialDriveConnected={false} />);

    fireEvent.click(screen.getByRole("button", { name: "New job" }));

    expect(
      await screen.findByRole("dialog", { name: "Connection needed" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Create a job" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
  });

  it("opens the new job sheet when Drive is already connected", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<JobsWorkspace {...defaultProps} initialDriveConnected />);

    fireEvent.click(screen.getByRole("button", { name: "New job" }));

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: "Create a job" }),
      ).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
