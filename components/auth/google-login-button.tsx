"use client";

import { useState } from "react";

export function GoogleLoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <a
      className="inline-flex w-full items-center justify-center rounded-full bg-[color:var(--foreground)] px-5 py-3 font-semibold text-white transition hover:bg-[color:var(--accent-strong)]"
      href="/auth/google"
      onClick={() => setIsLoading(true)}
    >
      {isLoading ? "Redirecting to Google..." : "Continue with Google"}
    </a>
  );
}

