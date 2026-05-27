import type { AuthFlowError } from "@/lib/server/auth/errors";
import { updateDriveConnectionStatus } from "@/lib/server/data/drive-connections";
import { logWarn, type LogContext } from "@/lib/server/logger";

function isAuthFlowError(error: unknown): error is AuthFlowError {
  return error instanceof Error && error.name === "AuthFlowError";
}

function isRevokedDriveCredentialError(error: unknown) {
  if (!isAuthFlowError(error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    error.code === "access_denied" ||
    message.includes("401") ||
    message.includes("403") ||
    message.includes("invalid_grant") ||
    message.includes("insufficient authentication") ||
    message.includes("invalid credentials")
  );
}

export async function markDriveConnectionIssue(
  businessId: string,
  error: unknown,
  context: LogContext = {}
) {
  if (!isAuthFlowError(error)) {
    return null;
  }

  const status = isRevokedDriveCredentialError(error) ? "revoked" : "error";
  const updated = await updateDriveConnectionStatus(businessId, status);

  logWarn("Drive reconnect required", {
    ...context,
    businessId,
    driveConnectionStatus: status
  });

  return updated;
}
