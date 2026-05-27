import { randomUUID } from "node:crypto";

type RequestLike = {
  headers?: Headers | { get(name: string): string | null | undefined };
  method?: string;
  url?: string;
};

export type LogContext = {
  requestId?: string;
  businessId?: string;
  userId?: string;
  documentId?: string;
  queueJobId?: string;
  route?: string;
  [key: string]: unknown;
};

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

function readHeader(request: RequestLike | undefined, name: string) {
  return request?.headers?.get(name) ?? null;
}

export function getRequestId(request?: RequestLike) {
  return (
    readHeader(request, "x-request-id") ??
    readHeader(request, "x-vercel-id") ??
    randomUUID()
  );
}

export function getRequestContext(
  request?: RequestLike,
  context: LogContext = {}
): LogContext {
  return {
    requestId: context.requestId ?? getRequestId(request),
    route: context.route ?? request?.url ?? undefined,
    method: request?.method,
    ...context
  };
}

function writeLog(
  level: "info" | "warn" | "error",
  message: string,
  error?: unknown,
  context?: LogContext
) {
  const payload = {
    level,
    message,
    context,
    error: error === undefined ? undefined : toErrorPayload(error),
    timestamp: new Date().toISOString()
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.info(JSON.stringify(payload));
}

export function logInfo(message: string, context?: LogContext) {
  writeLog("info", message, undefined, context);
}

export function logWarn(message: string, context?: LogContext) {
  writeLog("warn", message, undefined, context);
}

export function logError(message: string, error?: unknown, context?: LogContext) {
  writeLog("error", message, error, context);
}
