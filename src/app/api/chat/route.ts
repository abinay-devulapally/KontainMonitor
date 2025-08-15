import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatMessage {
  role: string;
  content: string;
}

export async function POST(req: Request) {
  try {
    const { messages, apiKey, model }: {
      messages: ChatMessage[];
      apiKey: string;
      model: string;
    } = await req.json();
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 400 });
    }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: messages.map((m) => ({
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
    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error("Chat error", err);
    return NextResponse.json({ error: "Failed to generate reply" }, { status: 500 });
  }
}
