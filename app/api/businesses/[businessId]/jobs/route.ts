import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "@/lib/server/auth/session";
import { JobServiceError, createJobForBusiness, listJobsForUser } from "@/lib/server/services/job-service";

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
  const statusParam = url.searchParams.get("status");
  const categoryId = url.searchParams.get("category");
  const search = url.searchParams.get("search");

  if (statusParam && !["active", "archived", "all"].includes(statusParam)) {
    return badRequest("Status must be active, archived, or all.");
  }

  if (
    categoryId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(categoryId)
  ) {
    return badRequest("Category filter must be a UUID.");
  }

  const result = await listJobsForUser({
    businessId,
    userId: session.userId,
    status: (statusParam as "active" | "archived" | "all" | null) ?? "active",
    categoryId,
    search
  });

  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    jobs: result.jobs
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ businessId: string }> }
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

  const { businessId } = await context.params;

  try {
    const result = await createJobForBusiness({
      businessId,
      userId: session.userId,
      values: body
    });

    return NextResponse.json(
      {
        job_id: result.job.id,
        drive_folder_id: result.job.drive_folder_id,
        folder_name: result.folderName
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid job payload.");
    }

    if (error instanceof JobServiceError) {
      if (error.code === "forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (error.code === "duplicate") {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }

      if (error.code === "invalid_category" || error.code === "drive_unavailable") {
        return badRequest(error.message);
      }
    }

    throw error;
  }
}
