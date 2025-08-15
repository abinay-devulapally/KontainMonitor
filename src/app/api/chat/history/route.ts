import { NextResponse } from "next/server";
import { getHistory, clearHistory } from "@/lib/chat-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const history = await getHistory();
  return NextResponse.json(history);
}

export async function DELETE() {
  await clearHistory();
  return new NextResponse(null, { status: 204 });
}
