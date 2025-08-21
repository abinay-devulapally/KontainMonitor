import Docker from "dockerode";
import * as k8s from "@kubernetes/client-node";
import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getDockerTarget(): string {
  if (process.env.DOCKER_HOST && process.env.DOCKER_HOST.trim() !== "") {
    return process.env.DOCKER_HOST.trim();
  }
  
  return process.platform === "win32"
    ? "//./pipe/docker_engine"
    : "/var/run/docker.sock";
}

// Enhanced Docker connection testing
async function testDockerConnection() {
  const dockerInfo = { 
    available: false, 
    target: getDockerTarget(), 
    reason: "",
    version: "",
    platform: ""
  };

  try {
    const docker = new Docker(
      process.env.DOCKER_HOST ? undefined : { socketPath: getDockerTarget() }
    );

    // Test with multiple methods for better reliability
    const connectionTests = await Promise.allSettled([
      // Primary test: ping
      docker.ping(),
      // Secondary test: version (more info)
      docker.version(),
    ]);

    const pingResult = connectionTests[0];
    const versionResult = connectionTests[1];

    if (pingResult.status === "fulfilled") {
      dockerInfo.available = true;
      
      if (versionResult.status === "fulfilled") {
        const version = versionResult.value;
        dockerInfo.version = version?.Version || "";
        dockerInfo.platform = version?.Platform?.Name || "";
      }
      
      console.log("Docker connection successful", {
        target: dockerInfo.target,
        version: dockerInfo.version,
        platform: dockerInfo.platform
      });
    } else {
      dockerInfo.reason = pingResult.reason instanceof Error 
        ? pingResult.reason.message 
        : String(pingResult.reason);
        
      console.warn("Docker connection failed", {
        target: dockerInfo.target,
        reason: dockerInfo.reason
      });
    }
  } catch (error) {
    dockerInfo.available = false;
    dockerInfo.reason = error instanceof Error ? error.message : String(error);
    console.error("Docker connection error:", error);
  }

  return dockerInfo;
}

// Enhanced Kubernetes connection testing
async function testKubernetesConnection() {
  const k8sInfo = { 
    available: false, 
    mode: "none" as "cluster" | "kubeconfig" | "none",
    reason: "",
    context: "",
    server: ""
  };

  try {
    const kc = new k8s.KubeConfig();
    
    // Determine connection mode
    if (process.env.KUBERNETES_SERVICE_HOST) {
      kc.loadFromCluster();
      k8sInfo.mode = "cluster";
      k8sInfo.server = process.env.KUBERNETES_SERVICE_HOST;
    } else {
      kc.loadFromDefault();
      k8sInfo.mode = "kubeconfig";
      k8sInfo.context = kc.getCurrentContext();
      
      const currentCluster = kc.getCurrentCluster();
      if (currentCluster?.server) {
        k8sInfo.server = currentCluster.server;
      }
    }

    // Test actual connectivity
    const clusters = kc.getClusters();
    k8sInfo.available = Array.isArray(clusters) && clusters.length > 0;

    if (k8sInfo.available) {
      // Additional connectivity test
      try {
        const coreApi = kc.makeApiClient(k8s.CoreV1Api);
        await Promise.race([
          coreApi.listNamespace(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 5000)
          )
        ]);
        console.log("Kubernetes connectivity verified");
      } catch (testError) {
        k8sInfo.available = false;
        k8sInfo.reason = `Connection test failed: ${testError instanceof Error ? testError.message : String(testError)}`;
      }
    }

    console.log("Kubernetes connection status", k8sInfo);
    
  } catch (error) {
    k8sInfo.available = false;
    k8sInfo.reason = error instanceof Error ? error.message : String(error);
    console.warn("Kubernetes connection failed:", error);
  }

  return k8sInfo;
}

export async function GET() {
  try {
    console.log("Checking environment connectivity...");
    
    // Run tests in parallel for better performance
    const [dockerInfo, k8sInfo, settings] = await Promise.allSettled([
      testDockerConnection(),
      testKubernetesConnection(),
      getSettings().catch(() => ({ allowContainerActions: false }))
    ]);

    const dockerResult = dockerInfo.status === "fulfilled" 
      ? dockerInfo.value 
      : { available: false, target: getDockerTarget(), reason: "Failed to test connection" };

    const k8sResult = k8sInfo.status === "fulfilled" 
      ? k8sInfo.value 
      : { available: false, mode: "none" as const, reason: "Failed to test connection" };

    const settingsResult = settings.status === "fulfilled" 
      ? settings.value 
      : { allowContainerActions: false };

    // Additional environment information
    const envInfo = {
      platform: process.platform,
      nodeVersion: process.version,
      architecture: process.arch,
      containerized: !!process.env.KUBERNETES_SERVICE_HOST || !!process.env.DOCKER_HOST,
      docker: dockerResult,
      kubernetes: k8sResult,
      actionsEnabled: process.env.ALLOW_CONTAINER_ACTIONS === "true" || 
                     settingsResult.allowContainerActions === true,
      environment: {
        DOCKER_HOST: process.env.DOCKER_HOST || "not set",
        KUBERNETES_SERVICE_HOST: process.env.KUBERNETES_SERVICE_HOST || "not set",
        NODE_ENV: process.env.NODE_ENV || "development",
      }
    };

    console.log("Environment check completed", {
      dockerAvailable: envInfo.docker.available,
      k8sAvailable: envInfo.kubernetes.available,
      actionsEnabled: envInfo.actionsEnabled
    });

    return NextResponse.json(envInfo);
    
  } catch (error) {
    console.error("Environment check failed:", error);
    
    return NextResponse.json(
      {
        platform: process.platform,
        error: "Failed to check environment",
        details: error instanceof Error ? error.message : String(error),
        docker: { available: false, target: getDockerTarget(), reason: "Environment check failed" },
        kubernetes: { available: false, mode: "none" as const, reason: "Environment check failed" },
        actionsEnabled: false,
      },
      { status: 500 }
    );
  }
}