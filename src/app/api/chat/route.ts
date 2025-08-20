import { NextResponse } from "next/server";
import { appendToSession, createSession } from "@/lib/chat-store";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_INSTRUCTION =
  "You are a senior SRE/DevOps assistant focused on Docker, Kubernetes, Podman, Rancher, container runtime performance, logs, and YAML/JSON configs. Answer concisely with clear steps, include commands for Linux/macOS/Windows as appropriate, and use GitHub-flavored Markdown for formatting. Use fenced code blocks with correct language hints (```bash, ```powershell, ```yaml, ```json). Prefer actionable diagnostics, kubectl/docker commands, and remediation.";

export async function POST(req: Request) {
  try {
    const schema = z.object({
      messages: z.array(z.object({ role: z.enum(["user", "model"]), content: z.string() })).min(1),
      apiKey: z.string().optional(),
      model: z.string().default("gemini-2.0-flash"),
      sessionId: z.string().optional(),
      stream: z.boolean().optional(),
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
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: parsed.messages.map((m) => ({
            role: m.role,
            parts: [{ text: m.content }],
          })),
          // Use an allowed MIME type; still instruct Markdown via system prompt
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
    // If stream requested, stream the final text in chunks to simulate token streaming
    if (parsed.stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream<Uint8Array>({
        start(controller) {
          function send(obj: unknown) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
          }
          // Inform client of sessionId
          send({ sessionId: ensuredSessionId });
          // Chunk the text to simulate token-by-token streaming
          const chunkSize = 40;
          for (let i = 0; i < text.length; i += chunkSize) {
            const delta = text.slice(i, i + chunkSize);
            if (delta) send({ delta });
          }
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
    console.error("Chat error", err);
    return NextResponse.json({ error: "Failed to generate reply" }, { status: 500 });
  }
}
