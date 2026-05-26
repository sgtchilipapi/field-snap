import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth/session";
import {
  ReviewServiceError,
  listNeedsReviewDocumentsForUser
} from "@/lib/server/services/review-service";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ businessId: string }> }
) {
  const session = await getSession();

  if (!session) {
    return unauthorized();
  }

  const { businessId } = await context.params;

  try {
    const result = await listNeedsReviewDocumentsForUser({
      businessId,
      userId: session.userId
    });

    return NextResponse.json({
      documents: result.documents
    });
  } catch (error) {
    if (error instanceof ReviewServiceError && error.code === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    throw error;
  }
}
