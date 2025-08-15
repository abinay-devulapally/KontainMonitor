import fs from "fs";
import path from "path";

export interface ChatMessage {
  role: "user" | "model";
  content: string;
  timestamp: string;
}

const historyPath = path.join(process.cwd(), "data", "chat-history.json");

async function readFile() {
  try {
    const data = await fs.promises.readFile(historyPath, "utf8");
    return JSON.parse(data) as ChatMessage[];
  } catch {
    return [];
  }
}

export async function getHistory() {
  return readFile();
}

export async function appendHistory(messages: ChatMessage[]) {
  const history = await readFile();
  history.push(...messages);
  await fs.promises.mkdir(path.dirname(historyPath), { recursive: true });
  await fs.promises.writeFile(historyPath, JSON.stringify(history, null, 2));
}

export async function clearHistory() {
  await fs.promises.mkdir(path.dirname(historyPath), { recursive: true });
  await fs.promises.writeFile(historyPath, JSON.stringify([], null, 2));
}
