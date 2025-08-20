import { NextResponse } from "next/server";
import { createSession, listSessions } from "@/lib/chat-store";
import { clientKey, rateLimit, getRateLimitConfig } from "@/lib/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessions = await listSessions();
    return NextResponse.json(sessions);
  } catch (err) {
    console.error("Failed to list sessions", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const rateLimitConfig = getRateLimitConfig();
    const ipKey = clientKey(req);
    
    if (rateLimitConfig.enabled && !rateLimit(`createSession:${ipKey}`, 30, 60_000)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
    
    // Validate input
    const schema = z.object({
      title: z.string().max(100).optional()
    });
    
    const body = await req.json().catch(() => ({}));
    const { title } = schema.parse(body);
    
    // Sanitize title
    const sanitizedTitle = (title || "New Chat")
      .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
      .trim()
      .slice(0, 100);
    
    const session = await createSession(sanitizedTitle);
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    console.error("Failed to create session", {
      error: err instanceof Error ? err.message : String(err),
      ip: clientKey(req),
      timestamp: new Date().toISOString()
    });
    
    if (err instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Invalid session data",
        details: err.issues.map(i => `${i.path.join('.')}: ${i.message}`)
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
