// Interface + in-memory implementation. In production on Vercel (multiple instances) swap the Map
// for Upstash Redis / Vercel KV – callers don't change.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): RateLimitResult {
  const now = Date.now();
  if (buckets.size > 10000) {
    for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    if (buckets.size > 10000) buckets.delete(buckets.keys().next().value!);
  }
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  b.count++;
  return {
    ok: b.count <= limit,
    remaining: Math.max(0, limit - b.count),
    retryAfterSec: Math.ceil((b.resetAt - now) / 1000),
  };
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL,
    token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return rateLimit(key, limit, windowSec);
  const redisKey = `ng:limit:${key}`;
  const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["EXPIRE", redisKey, windowSec, "NX"],
      ["TTL", redisKey],
    ]),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Rate limiting is temporarily unavailable");
  const results = (await response.json()) as {
    result?: number;
    error?: string;
  }[];
  if (results.some((r) => r.error)) throw new Error("Rate limiter error");
  const count = Number(results[0]?.result ?? limit + 1);
  return {
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSec:
      count > limit ? Math.max(1, Number(results[2]?.result ?? windowSec)) : 0,
  };
}
