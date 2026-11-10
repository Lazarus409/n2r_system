/**
 * Simple in-memory sliding-window rate limiter, keyed by client IP.
 * Good for a single server. If you run several instances behind a load balancer, move this to Redis.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const t = Date.now();
  const hits = (buckets.get(key) || []).filter((x) => t - x < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfter: Math.ceil((windowMs - (t - hits[0])) / 1000) };
  }
  hits.push(t);
  buckets.set(key, hits);
  if (buckets.size > 10000) for (const [k, v] of buckets) if (!v.some((x) => t - x < windowMs)) buckets.delete(k);
  return { ok: true, retryAfter: 0 };
}

/** Client IP. Behind a reverse proxy (nginx, Render, etc.) the proxy must set X-Forwarded-For. */
export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "local").trim();
}
