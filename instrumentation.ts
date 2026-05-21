import { logError } from "@/lib/server/logger";

declare global {
  // eslint-disable-next-line no-var
  var __fieldSnapInstrumentationRegistered: boolean | undefined;
}

export async function register() {
  if (globalThis.__fieldSnapInstrumentationRegistered) {
    return;
  }

  process.on("unhandledRejection", (reason) => {
    logError("Unhandled promise rejection", reason);
  });

  process.on("uncaughtException", (error) => {
    logError("Uncaught exception", error);
  });

  globalThis.__fieldSnapInstrumentationRegistered = true;
}

