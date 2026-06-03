"use client";

import { useState } from "react";

export function GoogleLoginButton({ href = "/auth/google" }: { href?: string }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <a
      className="inline-flex w-full items-center justify-center rounded-full bg-[color:var(--foreground)] px-5 py-3 font-semibold text-white transition hover:bg-[color:var(--accent-strong)]"
      href={href}
      onClick={() => setIsLoading(true)}
    >
      {isLoading ? "Redirecting to Google..." : "Sign-in with Google"}
    </a>
  );
}
