import { NextResponse } from "next/server";
import { getHistory } from "@/lib/chat-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const history = await getHistory();
  return NextResponse.json(history);
}
