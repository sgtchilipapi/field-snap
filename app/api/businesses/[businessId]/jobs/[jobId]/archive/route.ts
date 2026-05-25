import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth/session";
import { archiveJobForBusiness, JobServiceError } from "@/lib/server/services/job-service";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ businessId: string; jobId: string }> }
) {
  const session = await getSession();

  if (!session) {
    return unauthorized();
  }

  const { businessId, jobId } = await context.params;

  try {
    const job = await archiveJobForBusiness(businessId, jobId, session.userId);

    return NextResponse.json({
      job
    });
  } catch (error) {
    if (error instanceof JobServiceError) {
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
