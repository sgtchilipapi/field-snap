import { describe, expect, it } from "vitest";
import { getBusinessLandingPath } from "@/lib/server/services/business-service";

describe("getBusinessLandingPath", () => {
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
});
