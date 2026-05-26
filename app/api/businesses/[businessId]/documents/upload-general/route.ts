import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth/session";
import {
  DocumentUploadError,
  getMaxUploadSizeBytes,
  uploadGeneralDocument
} from "@/lib/server/services/document-upload-service";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ businessId: string }> }
) {
  const session = await getSession();

  if (!session) {
    return unauthorized();
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return badRequest("Invalid multipart form data.");
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return badRequest("Attach one image file.");
  }

  if (file.size > getMaxUploadSizeBytes()) {
    return badRequest("Image uploads must be 15 MB or smaller.");
  }

  const { businessId } = await context.params;

  try {
    const result = await uploadGeneralDocument({
      businessId,
      userId: session.userId,
      file
    });

    return NextResponse.json(
      {
        document_id: result.documentId,
        status: result.status
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof DocumentUploadError) {
      if (error.code === "forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (error.code === "not_found") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return badRequest(error.message);
    }

    throw error;
  }
}
