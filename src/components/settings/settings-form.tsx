"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";

export function SettingsForm() {
  const [apiKey, setApiKey] = React.useState("");
  const [model, setModel] = React.useState("gemini-2.0-flash");
  const [saved, setSaved] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const [showConnectionNotice, setShowConnectionNotice] = React.useState(true);
  const [allowActions, setAllowActions] = React.useState(false);

  React.useEffect(() => {
    setApiKey(localStorage.getItem("aiApiKey") || "");
    setModel(localStorage.getItem("aiModel") || "gemini-2.0-flash");
    const storedNotice = localStorage.getItem("showConnectionNotice");
    setShowConnectionNotice(storedNotice === null ? true : storedNotice === "true");
    // Load server settings
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : { allowContainerActions: false }))
      .then((s: { allowContainerActions?: boolean }) => setAllowActions(!!s.allowContainerActions))
      .catch(() => setAllowActions(false));
  }, []);

  const handleSave = () => {
    localStorage.setItem("aiApiKey", apiKey);
    localStorage.setItem("aiModel", model);
    localStorage.setItem("showConnectionNotice", String(showConnectionNotice));
    // Persist server-side setting
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowContainerActions: allowActions }),
    }).catch(() => {});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="apiKey">
          AI API Key {apiKey ? `(ending with ${apiKey.slice(-4)})` : ""}
        </Label>
        <Input
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your API key"
        />
      </div>
      <div className="space-y-2">
        <Label>Model</Label>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger>
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
            <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="theme">Dark Mode</Label>
        <Switch
          id="theme"
          checked={theme === "dark"}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="allowActions">Enable container actions</Label>
        <Switch
          id="allowActions"
          checked={allowActions}
          onCheckedChange={setAllowActions}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="connNotice">Connection notice</Label>
        <Switch
          id="connNotice"
          checked={showConnectionNotice}
          onCheckedChange={setShowConnectionNotice}
        />
      </div>
      <Button onClick={handleSave}>Save</Button>
      {saved && <p className="text-sm text-green-500">Settings saved</p>}
    </div>
  );
}

