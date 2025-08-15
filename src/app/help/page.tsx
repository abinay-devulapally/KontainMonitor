"use client";
import { MainLayout } from "@/components/main-layout";
import Link from "next/link";

export default function HelpPage() {
  return (
    <MainLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Help</h1>
        <p>Documentation and support resources will appear here.</p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>
            Configure your AI API key in the <Link href="/settings" className="underline">Settings</Link> page.
          </li>
          <li>Use the Chat section to interact with the AI assistant.</li>
          <li>
            Source code and issues available on
            <Link href="https://github.com/" className="underline ml-1">GitHub</Link>.
          </li>
        </ul>
      </div>
    </MainLayout>
  );
}
