import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "@/lib/server/auth/session";
import { JobServiceError, updateJobStatusForBusiness } from "@/lib/server/services/job-service";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ businessId: string; jobId: string }> }
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

  const { businessId, jobId } = await context.params;

  try {
    const payload = typeof body === "object" && body !== null ? (body as { status?: unknown }) : {};
    const job = await updateJobStatusForBusiness({
      businessId,
      jobId,
      userId: session.userId,
      status: payload.status
    });

    return NextResponse.json({
      job
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid job status.");
    }

    if (error instanceof JobServiceError) {
      if (error.code === "forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (error.code === "not_found") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (error.code === "duplicate") {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }

    throw error;
  }
}
