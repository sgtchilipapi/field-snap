import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/server/env";

export const SESSION_COOKIE_NAME = "field-snap-session";
export const AUTH_STATE_COOKIE_NAME = "field-snap-auth-state";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type Session = {
  userId: string;
  issuedAt: number;
};

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function shouldUseSecureCookies() {
  return env.APP_BASE_URL.startsWith("https://");
}

export function createSessionCookieValue(
  session: Session,
  secret: string = env.SESSION_SECRET
) {
  const payload = encodeBase64Url(JSON.stringify(session));
  const signature = signValue(payload, secret);
  return `${payload}.${signature}`;
}

export function parseSessionCookie(
  value: string | undefined,
  secret: string = env.SESSION_SECRET
): Session | null {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signValue(payload, secret);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as Session;

    if (!parsed.userId || typeof parsed.userId !== "string") {
      return null;
    }

    if (!parsed.issuedAt || typeof parsed.issuedAt !== "number") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  return parseSessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function setSession(userId: string) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, createSessionCookieValue({ userId, issuedAt: Date.now() }), {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export async function clearSession() {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    expires: new Date(0)
  });
}

export function createOAuthState() {
  return randomBytes(24).toString("hex");
}

export async function setOAuthState(state: string) {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: 60 * 10
  });
}

export async function getOAuthState() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_STATE_COOKIE_NAME)?.value ?? null;
}

export async function clearOAuthState() {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_STATE_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    expires: new Date(0)
  });
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}
