import { NextResponse } from "next/server";
import { clearHistory, getHistory } from "@/lib/chat-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const history = await getHistory();
    return NextResponse.json(history);
  } catch (err) {
    console.error("Failed to read chat history", err);
    // Always return JSON so clients parsing JSON won't fail
    return NextResponse.json([], { status: 200 });
  }
}

export async function DELETE() {
  try {
    await clearHistory();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to clear chat history", err);
    return NextResponse.json({ success: false, error: "Failed to clear chat history" }, { status: 500 });
  }
}
