"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MarkdownMessage } from "./markdown-message";
import "highlight.js/styles/github.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Send, Square, RefreshCw } from "lucide-react";

type Role = "user" | "model";
interface Message {
  role: Role;
  content: string;
  timestamp?: string;
}

export function ChatPanel() {
  const [sessions, setSessions] = React.useState<{
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  }[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [composer, setComposer] = React.useState("");
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [model, setModel] = React.useState("gemini-2.0-flash");
  const [apiKey, setApiKey] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState("");
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState("");

  const abortRef = React.useRef<AbortController | null>(null);
  const endRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setIsHydrated(true);
    setApiKey(localStorage.getItem("aiApiKey") || "");
    const savedModel = localStorage.getItem("aiModel");
    if (savedModel) setModel(savedModel);
    // initial sessions load
    refreshSessions(false);
  }, []);

  React.useEffect(() => {
    if (!activeSessionId) return;
    fetch(`/api/chat/sessions/${activeSessionId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((msgs: Message[]) => setMessages(Array.isArray(msgs) ? msgs : []))
      .catch(() => {});
  }, [activeSessionId]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function refreshSessions(selectFirst = false) {
    try {
      const r = await fetch("/api/chat/sessions", { cache: "no-store" });
      const list = (r.ok ? await r.json() : []) as typeof sessions;
      const s = Array.isArray(list) ? list : [];
      // Do not auto-create a session here; only when user clicks New Chat
      setSessions(s);
      if ((selectFirst || !activeSessionId) && s[0]) setActiveSessionId(s[0].id);
    } catch {
      // ignore
    }
  }

  async function newSession(title = "New Chat") {
    const resp = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    return (await resp.json()) as { id: string; title: string; createdAt: string; updatedAt: string };
  }

  async function handleSend() {
    const text = composer.trim();
    if (!text) return;
    const displayed: Message[] = [...messages, { role: "user", content: text }];
    setMessages(displayed);
    setComposer("");
    try {
      setIsSending(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      // Ensure we have a session id; if none selected, create one on first send
      let sid = activeSessionId;
      if (!sid) {
        const created = await newSession();
        setSessions((prev) => [created, ...prev]);
        setActiveSessionId(created.id);
        sid = created.id;
      }
      let res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ messages: displayed, apiKey, model, sessionId: sid, stream: true }),
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!res.ok || !res.body || !((res.headers.get("content-type") || "").includes("text/event-stream"))) {
        // Fallback: non-streaming request
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ messages: displayed, apiKey, model, sessionId: sid, stream: false }),
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          setMessages((prev) => [...prev, { role: "model", content: errText || "Error sending message" }]);
          return;
        }
        const data = await res.json();
        if (data?.sessionId && data.sessionId !== activeSessionId) {
          await refreshSessions();
          setActiveSessionId(data.sessionId);
        }
        setMessages((prev) => [...prev, { role: "model", content: data?.reply ?? "" }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let remainder = "";
      let sessionSet = false;
      // push placeholder assistant message for streaming
      setMessages((prev) => [...prev, { role: "model", content: "" }]);
      const appendDelta = (delta: string) => {
        if (!delta) return;
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === "model") last.content += delta;
          return copy;
        });
      };
      const handleEvent = async (line: string) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) return;
        const json = trimmed.slice(5).trim();
        if (!json) return;
        try {
          const evt = JSON.parse(json) as { delta?: string; done?: boolean; sessionId?: string };
          if (evt.sessionId && !sessionSet) {
            sessionSet = true;
            if (evt.sessionId !== activeSessionId) {
              await refreshSessions();
              setActiveSessionId(evt.sessionId);
            }
          }
          if (evt.delta) appendDelta(evt.delta);
        } catch { /* ignore parse errors */ }
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          // flush any remaining event
          if (remainder.trim()) await handleEvent(remainder);
          break;
        }
        remainder += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = remainder.indexOf("\n\n")) !== -1) {
          const event = remainder.slice(0, idx);
          remainder = remainder.slice(idx + 2);
          await handleEvent(event);
        }
      }
      // After stream finishes, bump recency
      setSessions((prev) => prev.map((s) => (s.id === activeSessionId ? { ...s, updatedAt: new Date().toISOString() } : s)));
      // auto-name first message
      const isFirst = messages.length === 0;
      const currentSid = activeSessionId;
      if (isFirst && currentSid) {
        const title = text.slice(0, 40).replace(/\n/g, " ");
        fetch(`/api/chat/sessions/${currentSid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        })
          .then(() => refreshSessions())
          .catch(() => {});
      }
    } catch (e) {
      if ((e as { name?: string }).name === "AbortError") {
        setMessages((prev) => [...prev, { role: "model", content: "[stopped]" }]);
      } else {
        setMessages((prev) => [...prev, { role: "model", content: "Error sending message" }]);
      }
    } finally {
      setIsSending(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  async function handleRegenerate() {
    if (messages.length < 2) return;
    // Remove last model message and resend last user message
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIndex === -1) return;
    const cut = messages.length - lastUserIndex - 1;
    const upto = messages.slice(0, cut + 1);
    setMessages(upto);
    setComposer("");
    try {
      setIsSending(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      let res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ messages: upto, apiKey, model, sessionId: activeSessionId, stream: true }),
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!res.ok || !res.body || !((res.headers.get("content-type") || "").includes("text/event-stream"))) {
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ messages: upto, apiKey, model, sessionId: activeSessionId, stream: false }),
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          setMessages((prev) => [...prev, { role: "model", content: errText || "Error sending message" }]);
          return;
        }
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "model", content: data?.reply ?? "" }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let remainder = "";
      // placeholder
      setMessages((prev) => [...prev, { role: "model", content: "" }]);
      const appendDelta = (delta: string) => {
        if (!delta) return;
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === "model") last.content += delta;
          return copy;
        });
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          if (remainder.trim()) {
            const line = remainder.trim();
            if (line.startsWith("data:")) {
              try {
                const evt = JSON.parse(line.slice(5).trim()) as { delta?: string };
                if (evt.delta) appendDelta(evt.delta);
              } catch {}
            }
          }
          break;
        }
        remainder += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = remainder.indexOf("\n\n")) !== -1) {
          const event = remainder.slice(0, idx).trim();
          remainder = remainder.slice(idx + 2);
          if (!event.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(event.slice(5).trim()) as { delta?: string };
            if (evt.delta) appendDelta(evt.delta);
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: "model", content: "Error regenerating" }]);
    } finally {
      setIsSending(false);
      abortRef.current = null;
    }
  }

  async function confirmDelete(id: string) {
    setConfirmDeleteId(id);
  }

  async function doDelete(id: string) {
    try {
      await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
      await refreshSessions(true);
      if (activeSessionId === id) {
        const next = sessions.find((x) => x.id !== id)?.id;
        if (next) setActiveSessionId(next);
        else setActiveSessionId(null);
        setMessages([]);
      }
    } finally {
      setConfirmDeleteId(null);
    }
  }

  async function commitRename(sid: string, title: string) {
    const name = title.trim();
    setEditingId(null);
    if (!name) return;
    try {
      await fetch(`/api/chat/sessions/${sid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: name }),
      });
      await refreshSessions();
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 border-r flex flex-col">
        <div className="p-2 border-b space-y-2">
          <Button className="w-full" size="sm" onClick={async () => {
            const created = await newSession();
            setSessions((prev) => [created, ...prev]);
            setActiveSessionId(created.id);
            setMessages([]);
          }}>
            <Plus className="h-4 w-4 mr-1" /> New Chat
          </Button>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search chats..."
            className="h-8"
          />
        </div>
        <ScrollArea className="flex-1 p-2">
          <div className="flex flex-col gap-1 pr-1">
            {sessions
              .filter((s) => s.title.toLowerCase().includes(filter.toLowerCase()))
              .map((s) => (
              <div key={s.id} className={cn("group rounded-md", s.id === activeSessionId && "bg-muted")}> 
                <div className="flex items-center gap-2">
                  <button
                    className={cn(
                      "flex-1 text-left text-sm p-2 rounded hover:bg-muted",
                      s.id === activeSessionId && "bg-muted"
                    )}
                    onClick={() => setActiveSessionId(s.id)}
                  >
                    {editingId === s.id ? (
                      <Input
                        autoFocus
                        value={editingTitle}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => commitRename(s.id, editingTitle)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(s.id, editingTitle);
                          if (e.key === "Escape") { setEditingId(null); setEditingTitle(""); }
                        }}
                        placeholder="Rename chat"
                        className="h-7"
                      />
                    ) : (
                      <div className="font-medium truncate">{s.title || "Untitled"}</div>
                    )}
                    <div className="text-xs text-muted-foreground" suppressHydrationWarning>
                      {isHydrated ? new Date(s.updatedAt || s.createdAt).toLocaleString() : new Date(s.updatedAt || s.createdAt).toISOString()}
                    </div>
                  </button>
                  <div className="flex items-center gap-1 pr-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                    <button
                      className="text-xs px-1 py-0.5 rounded hover:bg-accent"
                      title="Rename"
                      onClick={(e) => { e.stopPropagation(); setEditingId(s.id); setEditingTitle(s.title || ""); }}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      className="text-xs px-1 py-0.5 rounded hover:bg-accent"
                      title="Delete"
                      onClick={(e) => { e.stopPropagation(); confirmDelete(s.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 p-2 border-b">
          <div className="font-semibold truncate">
            {sessions.find((s) => s.id === activeSessionId)?.title || "Chat"}
          </div>
          <div className="flex items-center gap-2">
            {activeSessionId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const sid = activeSessionId;
                if (!sid) return;
                const s = sessions.find((x) => x.id === sid);
                setEditingId(sid);
                setEditingTitle(s?.title || "");
              }}
              title="Rename chat"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            )}
            {activeSessionId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => activeSessionId && setConfirmDeleteId(activeSessionId)}
              title="Delete chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            )}
            <Select value={model} onValueChange={(v) => { setModel(v); localStorage.setItem("aiModel", v); }}>
              <SelectTrigger className="h-8 w-56">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="mx-auto max-w-3xl">
            {!activeSessionId && (
              <div className="text-center text-sm text-muted-foreground py-12">
                Start a conversation by clicking <span className="font-medium">New Chat</span>.
              </div>
            )}
            {messages.map((m, idx) => (
              <div key={idx} className={cn("mb-4 flex items-start gap-2 animate-in fade-in-0", m.role === "user" ? "justify-end flex-row-reverse" : "justify-start")}> 
                {/* Avatar */}
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                  {m.role === "user" ? "You" : "KM"}
                </div>
                {/* Bubble */}
                <div className="group relative">
                  <div className={cn("rounded-lg px-3 py-2 max-w-[85%]", m.role === "user" ? "bg-primary text-primary-foreground whitespace-pre-wrap" : "bg-muted")}> 
                    {m.role === "model" ? (
                      <MarkdownMessage>{m.content}</MarkdownMessage>
                    ) : (
                      <div className="md-content text-sm">{m.content}</div>
                    )}
                  </div>
                  <button
                    className="absolute -top-2 right-0 text-xs px-1 py-0.5 rounded bg-background border opacity-0 group-hover:opacity-100 transition"
                    title="Copy message"
                    onClick={() => navigator.clipboard.writeText(m.content)}
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="mb-4 flex justify-start">
                <div className="rounded-lg px-3 py-2 max-w-[85%] bg-muted animate-pulse text-transparent select-none">
                  Loading response...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        {/* Composer */}
        <div className="border-t p-3">
          <div className="mx-auto max-w-3xl flex items-end gap-2">
            <Textarea
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message..."
              className="min-h-[44px] max-h-40 resize-y"
              rows={2}
            />
            <div className="flex gap-2 pb-1">
              <Button variant="outline" disabled={!isSending} onClick={handleStop} title="Stop">
                <Square className="h-4 w-4" />
              </Button>
              <Button variant="outline" disabled={isSending || messages.length < 1} onClick={handleRegenerate} title="Regenerate">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={handleSend} disabled={isSending || !composer.trim()}>
                <Send className="h-4 w-4 mr-1" /> Send
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat?</AlertDialogTitle>
            <AlertDialogDescription>Remove this chat and its messages permanently.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => doDelete(confirmDeleteId as string)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
