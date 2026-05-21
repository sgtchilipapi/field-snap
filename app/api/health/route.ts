import { NextResponse } from "next/server";
import { getHealthSnapshot } from "@/lib/server/services/health-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getHealthSnapshot();
  const status = snapshot.ok ? 200 : 503;

  return NextResponse.json(snapshot, { status });
}

