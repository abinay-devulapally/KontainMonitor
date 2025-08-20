type Bucket = { tokens: number; last: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, capacity = 10, refillMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key) || { tokens: capacity, last: now };
  const elapsed = now - b.last;
  const refill = Math.floor(elapsed / refillMs) * capacity;
  b.tokens = Math.min(capacity, b.tokens + refill);
  b.last = refill > 0 ? now : b.last;
  if (b.tokens <= 0) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}

export function clientKey(req: Request): string {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ua = req.headers.get("user-agent") || "";
  return `${ip || "local"}:${ua.slice(0, 24)}`;
}

