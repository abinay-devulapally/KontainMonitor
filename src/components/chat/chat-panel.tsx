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
  const [sessions, setSessions] = React.useState<{
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  }[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    setIsHydrated(true);
    setApiKey(localStorage.getItem("aiApiKey") || "");
    setModel(localStorage.getItem("aiModel") || "gemini-2.0-flash");
    // Load sessions
    fetch("/api/chat/sessions")
      .then((r) => r.ok ? r.json() : [])
      .then(async (list: any[]) => {
        let s = Array.isArray(list) ? list : [];
        if (s.length === 0) {
          const resp = await fetch("/api/chat/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "New Chat" }),
          });
          const created = await resp.json();
          s = [created];
        }
        setSessions(s);
        setActiveSessionId(s[0].id);
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!activeSessionId) return;
    fetch(`/api/chat/sessions/${activeSessionId}`)
      .then((r) => r.ok ? r.json() : [])
      .then((msgs: Message[]) => setMessages(Array.isArray(msgs) ? msgs : []))
      .catch(() => {});
  }, [activeSessionId]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const updated: Message[] = [...messages, { role: "user", content: input }];
    setMessages(updated);
    setInput("");
    // No client-side key check; server can use env key
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, apiKey, model, sessionId: activeSessionId }),
      });
      const data = await res.json();
      if (data.sessionId && data.sessionId !== activeSessionId) {
        setActiveSessionId(data.sessionId);
        setSessions((prev) => [{ id: data.sessionId, title: "New Chat", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...prev]);
      }
      setMessages([...updated, { role: "model", content: data.reply }]);
      // Update session recency locally
      setSessions((prev) => prev.map((s) => s.id === (data.sessionId || activeSessionId)
        ? { ...s, updatedAt: new Date().toISOString() }
        : s
      ));
      // Auto-name new chats from first user message
      const isFirst = messages.length === 0;
      const sid = (data.sessionId || activeSessionId) as string | null;
      if (isFirst && sid) {
        const title = (updated[0]?.content || "New Chat").slice(0, 40).replace(/\n/g, " ");
        fetch(`/api/chat/sessions/${sid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        }).then(() => setSessions((prev) => prev.map((s) => s.id === sid ? { ...s, title } : s))).catch(() => {});
      }
    } catch {
      setMessages([
        ...updated,
        { role: "model", content: "Error sending message" },
      ]);
    }
  };

  const startNewChat = async () => {
    try {
      const resp = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });
      const s = await resp.json();
      setSessions((prev) => [s, ...prev]);
      setActiveSessionId(s.id);
      setMessages([]);
    } catch {
      setMessages([]);
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-64 border-r p-2 flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={startNewChat}>New Chat</Button>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 pr-2">
            {sessions.map((s) => (
              <button
                key={s.id}
                className={cn(
                  "text-left text-sm p-2 rounded hover:bg-muted",
                  s.id === activeSessionId && "bg-muted"
                )}
                onClick={() => setActiveSessionId(s.id)}
              >
                <div className="font-medium truncate">{s.title || "Untitled"}</div>
                <div className="text-xs text-muted-foreground" suppressHydrationWarning>
                  {isHydrated
                    ? new Date(s.updatedAt || s.createdAt).toLocaleString()
                    : new Date(s.updatedAt || s.createdAt).toISOString()}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-grow p-4 border rounded-md m-2">
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
        <div className="flex gap-2 p-2">
          <Input
            placeholder="Type a message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <Button onClick={sendMessage} disabled={!activeSessionId}>Send</Button>
        </div>
      </div>
    </div>
  );
}
