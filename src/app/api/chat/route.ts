import { NextResponse } from "next/server";
import { appendToSession, createSession } from "@/lib/chat-store";
import { clientKey, rateLimit, getRateLimitConfig } from "@/lib/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_INSTRUCTION =
  "You are a senior SRE/DevOps assistant focused on Docker, Kubernetes, Podman, Rancher, container runtime performance, logs, and YAML/JSON configs. Answer concisely with clear steps, include commands for Linux/macOS/Windows as appropriate, and use GitHub-flavored Markdown for formatting. Use fenced code blocks with correct language hints (```bash, ```powershell, ```yaml, ```json). Prefer actionable diagnostics, kubectl/docker commands, and remediation.";

export async function POST(req: Request) {
  try {
    // Input validation schema with stricter limits
    const schema = z.object({
      messages: z.array(z.object({ 
        role: z.enum(["user", "model"]), 
        content: z.string().min(1).max(10000) // Limit message size
      })).min(1).max(50), // Limit conversation length
      apiKey: z.string().max(200).optional(), // Limit API key length
      model: z.string().regex(/^[a-zA-Z0-9\-\.]+$/).default("gemini-2.0-flash"), // Validate model name
      sessionId: z.string().uuid().optional(), // Ensure valid UUID
      stream: z.boolean().optional(),
    });
    
    const body = await req.json().catch(() => ({}));
    const parsed = schema.parse(body);

    // Enhanced rate limiting
    const rateLimitConfig = getRateLimitConfig();
    const ipKey = clientKey(req);
    
    if (rateLimitConfig.enabled && !rateLimit(`chat:${ipKey}`, rateLimitConfig.requestsPerMinute, 60_000)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
    }

    // Validate content for potential abuse
    const totalContent = parsed.messages.map(m => m.content).join("");
    if (totalContent.length > 20000) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    const allowedModels = new Set(["gemini-2.0-flash", "gemini-1.5-pro"]);
    const useModel = allowedModels.has(parsed.model) ? parsed.model : "gemini-2.0-flash";
    const serverApiKey = process.env.GOOGLE_API_KEY;
    const keyToUse = parsed.apiKey && parsed.apiKey.trim() !== "" ? parsed.apiKey : serverApiKey;
    
    if (!keyToUse) {
      console.warn("Chat API called without API key", { ip: ipKey });
      return NextResponse.json({ error: "Missing API key. Please configure your API key in settings." }, { status: 400 });
    }

    // Basic API key format validation (Google AI API keys start with 'AI')
    if (!keyToUse.startsWith('AI') || keyToUse.length < 20) {
      console.warn("Invalid API key format", { ip: ipKey });
      return NextResponse.json({ error: "Invalid API key format" }, { status: 400 });
    }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${keyToUse}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: parsed.messages.map((m) => ({
            role: m.role,
            parts: [{ text: m.content }],
          })),
          generationConfig: { responseMimeType: "text/plain", temperature: 0.4 },
        }),
      }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json().catch(() => undefined as any);

    // Build an informative error message when upstream fails or returns nothing.
    const extractError = () => {
      const reason =
        (data && (data.error?.message || data.error?.status)) ||
        (data && data.promptFeedback?.blockReason) ||
        (data && data.candidates?.[0]?.finishReason) ||
        (typeof data === "string" ? data : "Unknown error from model API");
      return `AI provider error: ${reason}. Check API key/model and try again.`;
    };

    // If upstream returned non-OK, propagate error so client can show it.
    if (!res.ok) {
      const errMsg = extractError();
      return new Response(errMsg, { status: res.status || 502, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    let text =
      data?.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join(" ") ||
      "";

    // If no text came back (e.g., safety block), surface a helpful error.
    if (!text || !text.trim()) {
      const errMsg = extractError();
      return new Response(errMsg, { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    // Light post-processing to improve Markdown/code formatting.
    const lastUser = parsed.messages[parsed.messages.length - 1]?.content || "";
    const wantsCode = /\b(code|script|function|class|snippet|example)\b/i.test(lastUser) || /```/.test(lastUser);
    const langFromPrompt = (() => {
      const l = lastUser.toLowerCase();
      if (/(python|py)\b/.test(l)) return "python";
      if (/(typescript|ts)\b/.test(l)) return "ts";
      if (/(javascript|js)\b/.test(l)) return "javascript";
      if (/(bash|shell|sh)\b/.test(l)) return "bash";
      if (/(powershell|ps1)\b/.test(l)) return "powershell";
      if (/(yaml|yml)\b/.test(l)) return "yaml";
      if (/(json)\b/.test(l)) return "json";
      if (/(dockerfile)\b/.test(l)) return "dockerfile";
      if (/(sql)\b/.test(l)) return "sql";
      return "";
    })();
    const hasFence = /```/.test(text);
    const looksLikeCode = /^(\s*#\!|\s*(def |class |import |from )|\s*console\.|\s*function |\s*class |\s*package |\s*SELECT\b|\s*apiVersion:)/m.test(text);
    // Remove leading boilerplate like "Okay, I can help..."
    text = text.replace(/^(?:\s*(?:ok(?:ay)?|sure|certainly|i can help(?: with that)?|here(?:'s| is)|to give you)[:,.!]?\s+)+/i, "").trimStart();
    if (wantsCode && !hasFence && looksLikeCode) {
      const lang = langFromPrompt || "";
      text = `\n\n\`\`\`${lang}\n${text}\n\`\`\`\n`;
    }

    const userMsg = parsed.messages[parsed.messages.length - 1];
    // Ensure we have a session to append to
    let ensuredSessionId = parsed.sessionId;
    if (!ensuredSessionId) {
      const created = await createSession("New Chat");
      ensuredSessionId = created.id;
    }
    // If stream requested, send complete text to avoid corruption issues
    if (parsed.stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream<Uint8Array>({
        start(controller) {
          function send(obj: unknown) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
          }
          
          // Send session info and complete text at once
          send({ sessionId: ensuredSessionId });
          send({ delta: text });
          send({ done: true });
          controller.close();
        },
      });
      // Persist messages once streaming is done (best-effort, not awaited here)
      appendToSession(ensuredSessionId, [
        { ...userMsg, timestamp: new Date().toISOString() },
        { role: "model", content: text, timestamp: new Date().toISOString() },
      ]).catch(() => {});
      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    } else {
      await appendToSession(ensuredSessionId, [
        { ...userMsg, timestamp: new Date().toISOString() },
        { role: "model", content: text, timestamp: new Date().toISOString() },
      ]);
      return NextResponse.json({ reply: text, sessionId: ensuredSessionId });
    }
  } catch (err) {
    console.error("Chat API error", {
      error: err instanceof Error ? err.message : String(err),
      ip: clientKey(req),
      timestamp: new Date().toISOString()
    });
    
    // Don't expose internal errors to client
    if (err instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Invalid request format",
        details: err.issues.map(i => `${i.path.join('.')}: ${i.message}`)
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: "Internal server error. Please try again later." 
    }, { status: 500 });
  }
}
