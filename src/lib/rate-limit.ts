type Bucket = { tokens: number; last: number };
const buckets = new Map<string, Bucket>();

// Clean up old buckets periodically to prevent memory leaks
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 300_000; // 5 minutes
const BUCKET_TTL = 3600_000; // 1 hour

function cleanupBuckets() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.last > BUCKET_TTL) {
      buckets.delete(key);
    }
  }
}

export function rateLimit(key: string, capacity = 10, refillMs = 60_000): boolean {
  cleanupBuckets();
  
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
  // Get real IP address from headers (supporting various proxy configurations)
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  
  const ip = (
    cfConnectingIp || 
    realIp || 
    (forwarded && forwarded.split(",")[0].trim()) || 
    "127.0.0.1"
  );
  
  // Sanitize and limit user agent to prevent abuse
  const ua = (req.headers.get("user-agent") || "unknown")
    .replace(/[^a-zA-Z0-9\s\-_.()]/g, "")
    .slice(0, 32);
    
  return `${ip}:${ua}`;
}

// Rate limit configuration from environment
export const getRateLimitConfig = () => ({
  enabled: process.env.RATE_LIMIT_ENABLED !== "false",
  requestsPerMinute: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || "60"),
});

