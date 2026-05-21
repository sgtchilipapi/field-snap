import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE_NAME = "field-snap-session";

export type Session = {
  userId: string;
};

export function parseSessionCookie(value: string | undefined): Session | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return {
    userId: trimmed
  };
}

export async function getSession() {
  const cookieStore = await cookies();
  return parseSessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}
