"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  role: "user" | "model";
  content: string;
}

export function ChatPanel() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [model, setModel] = React.useState("gemini-2.0-flash");

  React.useEffect(() => {
    setApiKey(localStorage.getItem("aiApiKey") || "");
    setModel(localStorage.getItem("aiModel") || "gemini-2.0-flash");
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

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-grow p-4 border rounded-md mb-4">
        {messages.map((m, idx) => (
          <div key={idx} className="mb-2">
            <span className={m.role === "user" ? "font-semibold" : "text-purple-400"}>
              {m.role === "user" ? "You" : "AI"}:
            </span>{" "}
            {m.content}
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
