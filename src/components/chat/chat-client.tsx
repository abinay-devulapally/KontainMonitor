"use client";
import { MainLayout } from "@/components/main-layout";
import { ChatPanel } from "./chat-panel";

export function ChatClient() {
  return (
    <MainLayout>
      <div className="p-4 h-[calc(100vh-2rem)]">
        <ChatPanel />
      </div>
    </MainLayout>
  );
}
