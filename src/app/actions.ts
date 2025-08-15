"use server";

import type { Container, Pod } from "@/types";

export async function getAiSuggestions(
  item: Container | Pod,
  apiKey: string,
  model: string
) {
  try {
    if (!apiKey) {
      throw new Error("Missing API key");
    }
    const isContainer = item.type === "container";
    const resourceUsageSummary = `CPU: ${item.cpuUsage
      .map((u) => u.value)
      .join(", ")}\nMemory: ${item.memoryUsage
      .map((u) => u.value)
      .join(", ")}`;

    const prompt = `You are an expert DevOps assistant. Analyze the configuration and usage and return JSON with keys "suggestions" and "rationale".\nContainer Config: ${
      isContainer ? item.config : "N/A"
    }\nPod Config: ${isContainer ? "N/A" : item.config}\nUsage: ${resourceUsageSummary}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );
    const data = await res.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      '{"suggestions":"No suggestions","rationale":"No rationale"}';
    return JSON.parse(text);
  } catch (error) {
    console.error("Error getting AI suggestions:", error);
    return {
      suggestions:
        "Unable to retrieve AI suggestions. Review resource usage and configuration manually.",
      rationale:
        "The AI service is unavailable or misconfigured. Check server logs and API keys.",
    };
  }
}
