import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth/session";
import {
  ReviewServiceError,
  getDocumentDetailForUser
} from "@/lib/server/services/review-service";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ businessId: string; documentId: string }> }
) {
  const session = await getSession();

  if (!session) {
    return unauthorized();
  }

  const { businessId, documentId } = await context.params;

  try {
    const result = await getDocumentDetailForUser({
      businessId,
      documentId,
      userId: session.userId
    });

    return NextResponse.json({
      document: result.document,
      audit_logs: result.auditLogs
    });
  } catch (error) {
    if (error instanceof ReviewServiceError) {
      if (error.code === "forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (error.code === "not_found") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    throw error;
  }
}
