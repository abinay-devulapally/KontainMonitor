import { NextResponse } from "next/server";
import { deleteSession, getSessionMessages, renameSession } from "@/lib/chat-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const messages = await getSessionMessages(params.id);
    if (!messages) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(messages);
  } catch (err) {
    console.error("Failed to get session messages", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.title === "string" && body.title.trim()) {
      await renameSession(params.id, body.title.trim());
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false }, { status: 400 });
  } catch (err) {
    console.error("Failed to rename session", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deleteSession(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete session", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

