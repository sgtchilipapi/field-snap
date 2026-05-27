type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitInput = {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function getStoreKey(bucket: string, key: string) {
  return `${bucket}:${key}`;
}

function pruneExpiredEntries(now: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function getClientAddress(request: {
  headers?: Headers | { get(name: string): string | null | undefined };
}) {
  const forwardedFor = request.headers?.get("x-forwarded-for") ?? null;

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers?.get("x-real-ip") ??
    request.headers?.get("cf-connecting-ip") ??
    "unknown"
  );
}

export function consumeRateLimit(input: RateLimitInput): RateLimitDecision {
  const now = input.now ?? Date.now();
  pruneExpiredEntries(now);

  const storeKey = getStoreKey(input.bucket, input.key);
  const existing = rateLimitStore.get(storeKey);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(storeKey, {
      count: 1,
      resetAt: now + input.windowMs
    });

    return {
      allowed: true,
      remaining: Math.max(0, input.limit - 1),
      retryAfterSeconds: Math.ceil(input.windowMs / 1000)
    };
  }

  existing.count += 1;
  rateLimitStore.set(storeKey, existing);

  return {
    allowed: existing.count <= input.limit,
    remaining: Math.max(0, input.limit - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
  };
}

export function resetRateLimitStore() {
  rateLimitStore.clear();
}
