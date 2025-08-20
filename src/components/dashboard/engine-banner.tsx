"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type EnvInfo = {
  platform: NodeJS.Platform;
  docker: { available: boolean; target: string; reason?: string };
  kubernetes: { available: boolean; mode: "cluster" | "kubeconfig" | "none"; reason?: string; context?: string };
  actionsEnabled?: boolean;
};

export function EngineBanner({ env }: { env: EnvInfo | null }) {
  if (!env) return null;
  const messages: string[] = [];
  const os = env.platform;
  if (!env.docker.available) {
    if (os === "win32") {
      messages.push(
        "Docker engine not reachable. For Linux containers, set DOCKER_HOST=tcp://host.docker.internal:2375 (enable TCP in Docker Desktop). For Windows containers, map \\.\\pipe\\docker_engine."
      );
    } else {
      messages.push(
        `Docker engine not reachable at ${env.docker.target}. Mount the socket (-v /var/run/docker.sock:/var/run/docker.sock) or set DOCKER_HOST to a reachable endpoint.`
      );
    }
    if (env.docker.reason) messages.push(`Reason: ${env.docker.reason}`);
  }
  if (!env.kubernetes.available) {
    messages.push(
      env.kubernetes.mode === "cluster"
        ? "In-cluster Kubernetes config not available."
        : "Kubeconfig not found. Mount ~/.kube/config into the container or run where kubeconfig is available."
    );
    if (env.kubernetes.reason) messages.push(`K8s: ${env.kubernetes.reason}`);
  }
  if (env.actionsEnabled === false) {
    messages.unshift("Container actions are disabled. Set ALLOW_CONTAINER_ACTIONS=true to enable start/stop/restart/delete.");
  }
  if (messages.length === 0) return null;
  return (
    <div className={cn("mt-3 mb-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900")}> 
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 mt-0.5" />
        <div className="space-y-1">
          <div className="font-medium">Connection notice</div>
          {messages.map((m, i) => (
            <div key={i} className="text-sm">{m}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
