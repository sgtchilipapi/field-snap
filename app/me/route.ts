import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth/session";
import { getUserWithMemberships } from "@/lib/server/data/users";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const details = await getUserWithMemberships(session.userId);

  if (!details) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: details.user.id,
      email: details.user.email,
      name: details.user.name,
      avatarUrl: details.user.avatar_url
    },
    businesses: details.memberships.map((membership) => ({
      id: membership.businessId,
      name: membership.businessName,
      membership: {
        role: membership.role,
        status: membership.status
      }
    }))
  });
}

