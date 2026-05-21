function toErrorPayload(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
  }

  return error;
}

export function logError(message: string, error?: unknown, context?: Record<string, unknown>) {
  console.error(
    JSON.stringify({
      level: "error",
      message,
      context,
      error: toErrorPayload(error),
      timestamp: new Date().toISOString()
    })
  );
}
