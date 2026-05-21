import { redirect } from "next/navigation";
import { requireSession } from "@/lib/server/auth/session";
import { getPostLoginRedirectForUser } from "@/lib/server/services/auth-service";

export default async function AuthenticatedHomePage() {
  const session = await requireSession();
  redirect(await getPostLoginRedirectForUser(session.userId));
}
