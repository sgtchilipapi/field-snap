import { describe, expect, it, vi } from "vitest";
import { checkDatabaseConnectivity } from "@/lib/server/db/health";

describe("checkDatabaseConnectivity", () => {
  it("returns ok when the query succeeds", async () => {
    const result = await checkDatabaseConnectivity(vi.fn().mockResolvedValue(undefined));

    expect(result).toEqual({ ok: true });
  });

  it("returns an error payload when the query fails", async () => {
    const result = await checkDatabaseConnectivity(
      vi.fn().mockRejectedValue(new Error("database down"))
    );

    expect(result).toEqual({
      ok: false,
      error: "database down"
    });
  });
});

