import * as k8s from "@kubernetes/client-node";
import { NextResponse } from "next/server";
import type { Pod } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    const api = kc.makeApiClient(k8s.CoreV1Api);
    const res = await api.listPodForAllNamespaces();
    const items = (res as any).body?.items ?? (res as any).items ?? [];
    const pods: Pod[] = items.map((p: k8s.V1Pod) => {
      const phase = p.status?.phase?.toLowerCase() || "pending";
      const phaseMap: Record<string, Pod["status"]> = {
        running: "running",
        pending: "pending",
        succeeded: "stopped",
        failed: "failed",
      };
      return {
        type: "pod",
        id: p.metadata?.uid || p.metadata?.name || "",
        name: p.metadata?.name || "",
        status: phaseMap[phase] || "pending",
        containers: p.spec?.containers?.map((c: k8s.V1Container) => c.name) || [],
        cpuUsage: [],
        memoryUsage: [],
        config: JSON.stringify(p, null, 2),
      };
    });
    return NextResponse.json(pods);
  } catch (err) {
    console.error("Failed to list pods", err);
    return new NextResponse("Failed to list pods", { status: 500 });
  }
}
