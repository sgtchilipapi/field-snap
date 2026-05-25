import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "@/lib/server/auth/session";
import {
  JobServiceError,
  getJobDetailsForUser,
  updateJobForBusiness
} from "@/lib/server/services/job-service";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ businessId: string; jobId: string }> }
) {
  const session = await getSession();

  if (!session) {
    return unauthorized();
  }

  const { businessId, jobId } = await context.params;
  const result = await getJobDetailsForUser(businessId, jobId, session.userId);

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!result.job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    job: result.job,
    folders: result.folders
  });
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
    const job = await updateJobForBusiness({
      businessId,
      jobId,
      userId: session.userId,
      values: body
    });

    return NextResponse.json({
      job
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid job payload.");
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

      if (error.code === "invalid_category") {
        return badRequest(error.message);
      }
    }

    throw error;
  }
}
