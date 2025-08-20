import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface ChatMessage {
  role: "user" | "model";
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

interface ChatStoreFile {
  version: 1;
  sessions: ChatSession[];
}

const historyPath = path.join(process.cwd(), "data", "chat-history.json");

async function readRaw(): Promise<unknown> {
  try {
    const data = await fs.promises.readFile(historyPath, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeStore(store: ChatStoreFile) {
  await fs.promises.mkdir(path.dirname(historyPath), { recursive: true });
  await fs.promises.writeFile(historyPath, JSON.stringify(store, null, 2));
}

let writeQueue: Promise<void> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(() => undefined, () => undefined);
  return run;
}

async function readStore(): Promise<ChatStoreFile> {
  const raw = await readRaw();
  // Backward compatibility: prior format was an array of ChatMessage
  if (Array.isArray(raw)) {
    const now = new Date().toISOString();
    const legacySession: ChatSession = {
      id: crypto.randomUUID(),
      title: "Legacy Chat",
      createdAt: now,
      updatedAt: now,
      messages: raw as ChatMessage[],
    };
    const store: ChatStoreFile = { version: 1, sessions: [legacySession] };
    // Best-effort upgrade in place
    await writeStore(store);
    return store;
  }
  const store = raw as ChatStoreFile | undefined;
  if (!store || !Array.isArray(store.sessions)) {
    return { version: 1, sessions: [] };
  }
  return store;
}

export async function listSessions(): Promise<Omit<ChatSession, "messages">[]> {
  const store = await readStore();
  return store.sessions.map(({ messages, ...meta }) => meta).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createSession(title = "New Chat"): Promise<Omit<ChatSession, "messages">> {
  return serialize(async () => {
    const store = await readStore();
    const now = new Date().toISOString();
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    store.sessions.unshift(session);
    await writeStore(store);
    const { messages, ...meta } = session;
    return meta;
  });
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const store = await readStore();
  const s = store.sessions.find((s) => s.id === sessionId);
  return s?.messages ?? [];
}

export async function appendToSession(sessionId: string, messages: ChatMessage[]) {
  return serialize(async () => {
    const store = await readStore();
    const s = store.sessions.find((s) => s.id === sessionId);
    if (!s) throw new Error("Session not found");
    s.messages.push(...messages);
    s.updatedAt = new Date().toISOString();
    await writeStore(store);
  });
}

export async function renameSession(sessionId: string, title: string) {
  return serialize(async () => {
    const store = await readStore();
    const s = store.sessions.find((s) => s.id === sessionId);
    if (!s) throw new Error("Session not found");
    s.title = title;
    s.updatedAt = new Date().toISOString();
    await writeStore(store);
  });
}

export async function deleteSession(sessionId: string) {
  return serialize(async () => {
    const store = await readStore();
    store.sessions = store.sessions.filter((s) => s.id !== sessionId);
    await writeStore(store);
  });
}

// Compatibility helpers used by existing API/UI
async function readLegacyHistory(): Promise<ChatMessage[]> {
  const store = await readStore();
  if (store.sessions.length === 0) return [];
  // Return the latest session messages to mimic prior behavior
  return store.sessions[0].messages;
}

export async function getHistory() {
  return readLegacyHistory();
}

export async function appendHistory(messages: ChatMessage[]) {
  const store = await readStore();
  if (store.sessions.length === 0) {
    const meta = await createSession("New Chat");
    await appendToSession(meta.id, messages);
    return;
  }
  await appendToSession(store.sessions[0].id, messages);
}

export async function clearHistory() {
  return serialize(async () => {
    await writeStore({ version: 1, sessions: [] });
  });
}
