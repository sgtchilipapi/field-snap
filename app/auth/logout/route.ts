import { NextResponse } from "next/server";
import { clearSession } from "@/lib/server/auth/session";
import { env } from "@/lib/server/env";

export async function POST() {
  await clearSession();
  return NextResponse.redirect(new URL("/login?logged_out=1", env.APP_BASE_URL), {
    status: 303
  });
}
