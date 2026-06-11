import { logError } from "@/lib/server/logger";

declare global {
  // eslint-disable-next-line no-var
  var __fylerrInstrumentationRegistered: boolean | undefined;
}

export async function register() {
  if (globalThis.__fylerrInstrumentationRegistered) {
    return;
  }

  process.on("unhandledRejection", (reason) => {
    logError("Unhandled promise rejection", reason);
  });

  process.on("uncaughtException", (error) => {
    logError("Uncaught exception", error);
  });

  globalThis.__fylerrInstrumentationRegistered = true;
}

