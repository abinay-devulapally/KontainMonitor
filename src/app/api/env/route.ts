import Docker from "dockerode";
import * as k8s from "@kubernetes/client-node";
import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dockerTarget() {
  if (process.env.DOCKER_HOST && process.env.DOCKER_HOST.trim() !== "") {
    return process.env.DOCKER_HOST.trim();
  }
  return process.platform === "win32"
    ? "//./pipe/docker_engine"
    : "/var/run/docker.sock";
}

export async function GET() {
  const dockerInfo = { available: false, target: dockerTarget(), reason: "" } as {
    available: boolean;
    target: string;
    reason?: string;
  };
  try {
    const docker = new Docker(
      process.env.DOCKER_HOST ? undefined : { socketPath: dockerTarget() }
    );
    // Test connectivity with a short timeout using version()
    await Promise.race([
      docker.version(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500)),
    ]);
    dockerInfo.available = true;
  } catch (e: unknown) {
    dockerInfo.available = false;
    dockerInfo.reason = e instanceof Error ? e.message : String(e);
  }

  const k8sInfo = { available: false, mode: "none" } as {
    available: boolean;
    mode: "cluster" | "kubeconfig" | "none";
    reason?: string;
    context?: string;
  };
  try {
    const kc = new k8s.KubeConfig();
    if (process.env.KUBERNETES_SERVICE_HOST) {
      kc.loadFromCluster();
      k8sInfo.mode = "cluster";
    } else {
      kc.loadFromDefault();
      k8sInfo.mode = "kubeconfig";
      k8sInfo.context = kc.getCurrentContext();
    }
    // Consider "available" if at least one cluster is configured
    const clusters = kc.getClusters();
    k8sInfo.available = Array.isArray(clusters) && clusters.length > 0;
  } catch (e: unknown) {
    k8sInfo.available = false;
    k8sInfo.reason = e instanceof Error ? e.message : String(e);
  }

  const settings = await getSettings().catch(() => ({ allowContainerActions: false }));
  return NextResponse.json({
    platform: process.platform,
    docker: dockerInfo,
    kubernetes: k8sInfo,
    actionsEnabled: process.env.ALLOW_CONTAINER_ACTIONS === "true" || settings.allowContainerActions === true,
  });
}
