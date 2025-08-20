import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/settings-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("Failed to read settings", err);
    return NextResponse.json({ allowContainerActions: false });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const allow = typeof body.allowContainerActions === "boolean" ? body.allowContainerActions : undefined;
    if (typeof allow === "undefined") {
      return NextResponse.json({ error: "Missing allowContainerActions" }, { status: 400 });
    }
    const updated = await updateSettings({ allowContainerActions: allow });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update settings", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

