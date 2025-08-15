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
      // The client library types differ across versions; fall back to any for compatibility
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await api.listPodForAllNamespaces();
      const items: k8s.V1Pod[] = res.body?.items ?? res.items ?? [];
      const pods: Pod[] = items.map((p) => {
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
