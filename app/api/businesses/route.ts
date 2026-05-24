import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "@/lib/server/auth/session";
import {
  createBusiness,
  listBusinessesForUser
} from "@/lib/server/services/business-service";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const session = await getSession();

  if (!session) {
    return unauthorized();
  }

  const businesses = await listBusinessesForUser(session.userId);
  return NextResponse.json({ businesses });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return unauthorized();
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const business = await createBusiness(body, session.userId);

    return NextResponse.json(
      {
        business_id: business.id,
        name: business.name,
        drive_root_folder_id: business.drive_root_folder_id
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message ?? "Invalid business payload."
        },
        { status: 400 }
      );
    }

    throw error;
  }
}
