import { NextResponse } from "next/server";
import { createSession, listSessions } from "@/lib/chat-store";
import { clientKey, rateLimit } from "@/lib/rate-limit";

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
    const ipKey = clientKey(req);
    if (!rateLimit(`createSession:${ipKey}`, 30, 60_000)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
    const { title }: { title?: string } = await req.json().catch(() => ({}));
    const session = await createSession(title || "New Chat");
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    console.error("Failed to create session", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
