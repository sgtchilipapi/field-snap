import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth/session";

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    redirect("/app");
  }

  redirect("/login");
}

