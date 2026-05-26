import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth/session";
import {
  ReviewServiceError,
  listBusinessDocumentsForUser
} from "@/lib/server/services/review-service";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ businessId: string }> }
) {
  const session = await getSession();

  if (!session) {
    return unauthorized();
  }

  const { businessId } = await context.params;
  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  try {
    const result = await listBusinessDocumentsForUser({
      businessId,
      userId: session.userId,
      status
    });

    return NextResponse.json({
      documents: result.documents
    });
  } catch (error) {
    if (error instanceof ReviewServiceError) {
      if (error.code === "forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (error.code === "invalid_filter") {
        return badRequest(error.message);
      }
    }

    throw error;
  }
}
