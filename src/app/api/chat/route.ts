import { NextResponse } from "next/server";
import { appendToSession, createSession } from "@/lib/chat-store";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export async function POST(req: Request) {
  try {
    const schema = z.object({
      messages: z.array(z.object({ role: z.enum(["user", "model"]), content: z.string() })).min(1),
      apiKey: z.string().optional(),
      model: z.string().default("gemini-2.0-flash"),
      sessionId: z.string().optional(),
    });
    const parsed = schema.parse(await req.json());

    const ipKey = clientKey(req);
    if (!rateLimit(`chat:${ipKey}`, 20, 60_000)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const allowedModels = new Set(["gemini-2.0-flash", "gemini-1.5-pro"]);
    const useModel = allowedModels.has(parsed.model) ? parsed.model : "gemini-2.0-flash";
    const serverApiKey = process.env.GOOGLE_API_KEY;
    const keyToUse = parsed.apiKey && parsed.apiKey.trim() !== "" ? parsed.apiKey : serverApiKey;
    if (!keyToUse) {
      return NextResponse.json({ error: "Missing API key" }, { status: 400 });
    }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${keyToUse}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: parsed.messages.map((m) => ({
            role: m.role,
            parts: [{ text: m.content }],
          })),
        }),
      }
    );
    const data = await res.json();
    const text =
      data.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join(" ") ||
      "";

    const userMsg = parsed.messages[parsed.messages.length - 1];
    // Ensure we have a session to append to
    let ensuredSessionId = parsed.sessionId;
    if (!ensuredSessionId) {
      const created = await createSession("New Chat");
      ensuredSessionId = created.id;
    }
    await appendToSession(ensuredSessionId, [
      { ...userMsg, timestamp: new Date().toISOString() },
      { role: "model", content: text, timestamp: new Date().toISOString() },
    ]);

    return NextResponse.json({ reply: text, sessionId: ensuredSessionId });
  } catch (err) {
    console.error("Chat error", err);
    return NextResponse.json({ error: "Failed to generate reply" }, { status: 500 });
  }
}
