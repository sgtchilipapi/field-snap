import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth/session";
import { getPostLoginRedirectForUser } from "@/lib/server/services/auth-service";

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    redirect(await getPostLoginRedirectForUser(session.userId));
  }

  redirect("/login");
}
