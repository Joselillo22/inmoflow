import { NextRequest, NextResponse } from "next/server";
import { RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis";

// Singleton Redis connection for rate limiting
let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6382";
    redisClient = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    redisClient.connect().catch(() => {
      // Redis unavailable — rate limiting will be bypassed gracefully
    });
  }
  return redisClient;
}

// Rate limit configurations by type
const LIMITS: Record<string, { points: number; duration: number }> = {
  auth:     { points: 5,   duration: 900 },  // 5 req / 15 min
  search:   { points: 30,  duration: 60 },   // 30 req / 1 min
  write:    { points: 60,  duration: 60 },   // 60 req / 1 min
  upload:   { points: 10,  duration: 60 },   // 10 req / 1 min
  cron:     { points: 5,   duration: 60 },   // 5 req / 1 min
  general:  { points: 100, duration: 60 },   // 100 req / 1 min
};

// Cache of limiters by type
const limiters: Record<string, RateLimiterRedis> = {};

function getLimiter(type: string): RateLimiterRedis {
  if (!limiters[type]) {
    const config = LIMITS[type] ?? LIMITS.general;
    limiters[type] = new RateLimiterRedis({
      storeClient: getRedis(),
      keyPrefix: `rl:${type}`,
      points: config.points,
      duration: config.duration,
    });
  }
  return limiters[type];
}

// Determine rate limit type from request
function getType(req: NextRequest): string {
  const path = req.nextUrl.pathname;
  const method = req.method;

  if (path.startsWith("/api/auth")) return "auth";

  // Cron/webhook endpoints
  if (
    path.startsWith("/api/portales/email-parse") ||
    path.startsWith("/api/whatsapp/reminders") ||
    path.startsWith("/api/automatizaciones/check") ||
    path.startsWith("/api/automatizaciones/seed") ||
    path.startsWith("/api/notificaciones/check") ||
    path.startsWith("/api/informes/generate")
  ) return "cron";

  // Upload
  if (path.match(/\/api\/inmuebles\/[^/]+\/fotos/) && method === "POST") return "upload";

  // Search (GET on list endpoints)
  if (method === "GET" && (
    path === "/api/leads" ||
    path === "/api/inmuebles" ||
    path === "/api/comerciales" ||
    path === "/api/propietarios" ||
    path === "/api/operaciones" ||
    path === "/api/inbox" ||
    path === "/api/dashboard"
  )) return "search";

  // Write operations
  if (method === "POST" || method === "PATCH" || method === "DELETE") return "write";

  return "general";
}

// Get client identifier (userId if authenticated, IP otherwise)
function getKey(req: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`;
  const forwarded = req.headers.get("x-forwarded-for");
  const real = req.headers.get("x-real-ip");
  return `ip:${forwarded?.split(",")[0]?.trim() ?? real ?? "unknown"}`;
}

/**
 * Apply rate limiting to an API route handler.
 * Usage: export const GET = withRateLimit(handler) or withRateLimit(handler, 'auth')
 */
export function withRateLimit(
  handler: (req: NextRequest, ctx?: any) => Promise<NextResponse> | NextResponse,
  typeOverride?: string
) {
  return async (req: NextRequest, ctx?: any): Promise<NextResponse> => {
    // Bypass for cron jobs with valid API key
    const apiKey = req.headers.get("x-api-key");
    if (apiKey && apiKey === process.env.PORTALES_API_KEY) {
      return handler(req, ctx);
    }

    const type = typeOverride ?? getType(req);
    const limiter = getLimiter(type);

    // Extract userId from auth cookie if possible (lightweight check)
    // We use the cookie presence as a proxy for authenticated user
    const sessionCookie = req.cookies.get("__Secure-authjs.session-token")?.value;
    const key = getKey(req, sessionCookie ? `session:${sessionCookie.slice(-16)}` : undefined);

    try {
      const result = await limiter.consume(key);

      const response = await handler(req, ctx);

      // Add rate limit headers
      response.headers.set("RateLimit-Limit", String(LIMITS[type]?.points ?? 100));
      response.headers.set("RateLimit-Remaining", String(result.remainingPoints));
      response.headers.set("RateLimit-Reset", String(Math.ceil(result.msBeforeNext / 1000)));

      return response;
    } catch (rateLimiterRes) {
      // Rate limited
      const res = rateLimiterRes as { remainingPoints?: number; msBeforeNext?: number };
      const retryAfter = Math.ceil((res.msBeforeNext ?? 60000) / 1000);

      return NextResponse.json(
        {
          error: "Demasiadas peticiones. Inténtalo de nuevo más tarde.",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "RateLimit-Limit": String(LIMITS[type]?.points ?? 100),
            "RateLimit-Remaining": "0",
            "RateLimit-Reset": String(retryAfter),
          },
        }
      );
    }
  };
}
