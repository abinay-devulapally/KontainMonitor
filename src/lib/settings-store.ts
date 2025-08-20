import fs from "fs";
import path from "path";

export type AppSettings = {
  allowContainerActions: boolean;
};

const settingsPath = path.join(process.cwd(), "data", "settings.json");

async function readRaw(): Promise<unknown> {
  try {
    const raw = await fs.promises.readFile(settingsPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeRaw(settings: AppSettings): Promise<void> {
  await fs.promises.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2));
}

export async function getSettings(): Promise<AppSettings> {
  const raw = (await readRaw()) as Partial<AppSettings> | undefined;
  return {
    allowContainerActions: raw?.allowContainerActions === true,
  };
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next: AppSettings = {
    ...current,
    ...partial,
    allowContainerActions: partial.allowContainerActions ?? current.allowContainerActions,
  };
  await writeRaw(next);
  return next;
}

