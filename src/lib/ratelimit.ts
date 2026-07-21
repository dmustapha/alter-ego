// src/lib/ratelimit.ts
// In-memory per-IP token bucket. For production durability across serverless
// instances, swap this Map for @upstash/ratelimit (Redis-backed).
const WINDOW_MS = 60_000;
const LIMIT = 10;
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now >= b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= LIMIT) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, retryAfter: 0 };
}
