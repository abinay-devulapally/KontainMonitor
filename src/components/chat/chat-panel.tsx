"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "model";
  content: string;
  timestamp?: string;
}

export function ChatPanel() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [model, setModel] = React.useState("gemini-2.0-flash");

  React.useEffect(() => {
    setApiKey(localStorage.getItem("aiApiKey") || "");
    setModel(localStorage.getItem("aiModel") || "gemini-2.0-flash");
    fetch("/api/chat/history")
      .then((res) => res.json())
      .then((data: Message[]) => setMessages(data))
      .catch(() => {});
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const updated: Message[] = [...messages, { role: "user", content: input }];
    setMessages(updated);
    setInput("");
    if (!apiKey) {
      setMessages([
        ...updated,
        { role: "model", content: "Set API key in Settings" },
      ]);
      return;
    }
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, apiKey, model }),
      });
      const data = await res.json();
      setMessages([...updated, { role: "model", content: data.reply }]);
    } catch {
      setMessages([
        ...updated,
        { role: "model", content: "Error sending message" },
      ]);
    }
  };

  const startNewChat = async () => {
    setMessages([]);
    try {
      await fetch("/api/chat/history", { method: "DELETE" });
    } catch {}
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between mb-2">
        <Button variant="outline" size="sm" onClick={startNewChat}>
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-grow p-4 border rounded-md mb-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={cn(
              "mb-4 flex",
              m.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "rounded-lg px-3 py-2 max-w-[80%] whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <div className="prose prose-sm dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {m.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
      </ScrollArea>
      <div className="flex gap-2">
        <Input
          placeholder="Type a message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <Button onClick={sendMessage}>Send</Button>
      </div>
    </div>
  );
}
