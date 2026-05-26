import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "@/lib/server/auth/session";
import {
  ReviewServiceError,
  patchDocumentForReview
} from "@/lib/server/services/review-service";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ businessId: string; documentId: string }> }
) {
  const session = await getSession();

  if (!session) {
    return unauthorized();
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const { businessId, documentId } = await context.params;

  try {
    const result = await patchDocumentForReview({
      businessId,
      documentId,
      userId: session.userId,
      values: body
    });

    return NextResponse.json({
      document: result.document,
      audit_logs: result.auditLogs
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid review payload.");
    }

    if (error instanceof ReviewServiceError) {
      if (error.code === "forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (error.code === "not_found") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (error.code === "invalid_review") {
        return badRequest(error.message);
      }

      if (error.code === "drive_unavailable") {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
    }

    throw error;
  }
}
