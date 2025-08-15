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

  React.useEffect(() => {
    setApiKey(localStorage.getItem("aiApiKey") || "");
    setModel(localStorage.getItem("aiModel") || "gemini-2.0-flash");
  }, []);

  const handleSave = () => {
    localStorage.setItem("aiApiKey", apiKey);
    localStorage.setItem("aiModel", model);
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
      <Button onClick={handleSave}>Save</Button>
      {saved && <p className="text-sm text-green-500">Settings saved</p>}
    </div>
  );
}

