import { describe, expect, it } from "vitest";
import { beforeEach, vi } from "vitest";
vi.mock("@/lib/server/audit/logs", () => ({
  AUDIT_ACTIONS: {
    businessCreated: "business.created"
  },
  recordAuditEvent: vi.fn()
}));

vi.mock("@/lib/server/data/businesses", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/data/businesses")>(
    "@/lib/server/data/businesses"
  );

  return {
    ...actual,
    createBusinessForOwner: vi.fn()
  };
});

import { getBusinessLandingPath } from "@/lib/server/services/business-service";
import { recordAuditEvent } from "@/lib/server/audit/logs";
import { createBusinessForOwner } from "@/lib/server/data/businesses";
import { createBusiness } from "@/lib/server/services/business-service";

const mockedRecordAuditEvent = vi.mocked(recordAuditEvent);
const mockedCreateBusinessForOwner = vi.mocked(createBusinessForOwner);

describe("getBusinessLandingPath", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("routes owners without Drive to settings", () => {
    expect(
      getBusinessLandingPath({
        id: "business-1",
        role: "owner_admin",
        driveConnected: false
      })
    ).toBe("/businesses/business-1/settings");
  });

  it("routes Drive-connected owners to jobs", () => {
    expect(
      getBusinessLandingPath({
        id: "business-1",
        role: "owner_admin",
        driveConnected: true
      })
    ).toBe("/businesses/business-1/jobs");
  });

  it("routes non-owners to jobs", () => {
    expect(
      getBusinessLandingPath({
        id: "business-1",
        role: "reviewer",
        driveConnected: false
      })
    ).toBe("/businesses/business-1/jobs");
  });

  it("creates a business and records a business.created audit event", async () => {
    mockedCreateBusinessForOwner.mockResolvedValue({
      id: "business-1",
      name: "ABC Landscaping",
      owner_user_id: "user-1",
      drive_root_folder_id: null,
      general_docs_folder_id: null,
      created_at: new Date(),
      updated_at: new Date()
    } as never);

    await createBusiness({ name: "ABC Landscaping" }, "user-1");

    expect(mockedRecordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "business-1",
        actorUserId: "user-1",
        entityType: "business",
        entityId: "business-1",
        action: "business.created"
      })
    );
  });
});
