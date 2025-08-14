"use server";

import { suggestResourceImprovements } from "@/ai/flows/suggest-resource-improvements";
import type { Container, Pod } from "@/types";

export async function getAiSuggestions(item: Container | Pod) {
  try {
    const isContainer = item.type === "container";
    
    // Create a summary of resource usage
    const resourceUsageSummary = `
    CPU Usage (last 30 mins, %): ${item.cpuUsage.map(u => u.value).join(", ")}
    Memory Usage (last 30 mins, %): ${item.memoryUsage.map(u => u.value).join(", ")}
    `;

    const input = {
      containerConfiguration: isContainer ? item.config : "N/A - This is a Pod",
      podConfiguration: isContainer ? (item as Container).podId ? "See container config" : "N/A" : item.config,
      resourceUsageData: resourceUsageSummary,
    };

    const result = await suggestResourceImprovements(input);
    return result;

  } catch (error) {
    console.error("Error getting AI suggestions:", error);
    throw new Error("Failed to get AI suggestions. Please check the server logs.");
  }
}
