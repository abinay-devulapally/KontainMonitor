import Docker from "dockerode";
import { NextResponse } from "next/server";
import type { Container } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Enhanced Docker connection with better error handling and platform detection
function createDockerConnection(): Docker {
  try {
    // If DOCKER_HOST is explicitly set, use it
    if (process.env.DOCKER_HOST) {
      console.log(`Using DOCKER_HOST: ${process.env.DOCKER_HOST}`);
      return new Docker();
    }

    // Platform-specific socket detection
    const platform = process.platform;
    let socketPath: string;

    switch (platform) {
      case "win32":
        // Windows: Try named pipe first, then TCP fallback
        socketPath = "//./pipe/docker_engine";
        break;
      case "darwin":
      case "linux":
      default:
        // Unix-like systems: Standard Docker socket
        socketPath = "/var/run/docker.sock";
        break;
    }

    console.log(`Using platform-specific socket: ${socketPath} (platform: ${platform})`);
    
    return new Docker({
      socketPath,
      // Add timeout for better error handling
      timeout: 5000,
    });
  } catch (error) {
    console.error("Failed to create Docker connection:", error);
    throw error;
  }
}

const docker = createDockerConnection();

// Enhanced engine detection with better error handling
async function detectContainerEngine(): Promise<Container["engine"]> {
  try {
    const version = await docker.version();
    const platformName = version?.Platform?.Name?.toLowerCase() || "";
    
    console.log("Docker version info:", { 
      version: version?.Version, 
      platform: platformName 
    });

    if (platformName.includes("rancher")) return "rancher";
    if (platformName.includes("podman")) return "podman";
    return "docker";
  } catch (error) {
    console.warn("Failed to detect container engine, defaulting to docker:", error);
    return "docker";
  }
}

export async function GET() {
  try {
    console.log("Fetching containers list...");
    
    // Test Docker connectivity first
    try {
      await docker.ping();
      console.log("Docker ping successful");
    } catch (pingError) {
      console.error("Docker ping failed:", pingError);
      return NextResponse.json(
        { error: "Docker daemon not accessible", details: String(pingError) },
        { status: 503 }
      );
    }

    const [list, engineName] = await Promise.all([
      docker.listContainers({ all: true }),
      detectContainerEngine(),
    ]);

    console.log(`Found ${list.length} containers using engine: ${engineName}`);

    const containers: Container[] = await Promise.all(
      list.map(async (c: Docker.ContainerInfo) => {
        let config = "";
        try {
          const inspect = await docker.getContainer(c.Id).inspect();
          config = JSON.stringify(inspect.Config, null, 2);
        } catch (inspectError) {
          console.warn(`Failed to inspect container ${c.Id}:`, inspectError);
          config = "Failed to load container configuration";
        }

        // Enhanced status mapping
        const statusMap: Record<string, Container["status"]> = {
          running: "running",
          exited: "stopped",
          dead: "error",
          paused: "paused",
          restarting: "error",
          removing: "stopped",
          created: "stopped",
        };

        const state = (c.State as keyof typeof statusMap) || "stopped";
        
        // Enhanced health detection
        const health: Container["health"] = (() => {
          if (c.Status?.includes("(healthy)")) return "healthy";
          if (c.Status?.includes("(unhealthy)")) return "unhealthy";
          if (c.Status?.includes("(starting)")) return "not-enabled";
          return "not-enabled";
        })();

        return {
          type: "container" as const,
          id: c.Id,
          name: c.Names?.[0]?.replace(/^\//, "") || c.Id.substring(0, 12),
          status: statusMap[state] || "stopped",
          health,
          image: c.Image,
          engine: engineName,
          cpuUsage: [],
          memoryUsage: [],
          networkIO: { in: [], out: [] },
          logs: [],
          config,
        };
      })
    );

    console.log("Successfully processed containers");
    return NextResponse.json(containers);
    
  } catch (error) {
    console.error("Failed to list containers:", error);
    
    // Provide detailed error information
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      code: error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined,
      errno: error && typeof error === 'object' && 'errno' in error ? String(error.errno) : undefined,
      syscall: error && typeof error === 'object' && 'syscall' in error ? String(error.syscall) : undefined,
      path: error && typeof error === 'object' && 'path' in error ? String(error.path) : undefined,
      dockerHost: process.env.DOCKER_HOST || "not set",
      platform: process.platform,
    };

    return NextResponse.json(
      { 
        error: "Failed to list containers", 
        details: errorDetails,
        suggestions: [
          "Ensure Docker daemon is running",
          "Check Docker socket permissions",
          "Verify container has Docker socket access",
          "Try setting DOCKER_HOST environment variable"
        ]
      },
      { status: 500 }
    );
  }
}