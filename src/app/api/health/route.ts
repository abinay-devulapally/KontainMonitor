import { NextResponse } from "next/server";
import Docker from "dockerode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Check basic application health
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || "unknown",
      services: {
        docker: "unknown",
        filesystem: "unknown"
      }
    };

    // Test Docker connectivity
    try {
      const docker = new Docker(
        process.env.DOCKER_HOST
          ? undefined
          : {
              socketPath:
                process.platform === "win32"
                  ? "//./pipe/docker_engine"
                  : "/var/run/docker.sock",
            }
      );
      
      await docker.ping();
      health.services.docker = "healthy";
    } catch {
      health.services.docker = "unavailable";
    }

    // Test filesystem access
    try {
      const fs = await import("fs/promises");
      await fs.access("./data", fs.constants.R_OK | fs.constants.W_OK);
      health.services.filesystem = "healthy";
    } catch {
      health.services.filesystem = "error";
    }

    const responseTime = Date.now() - startTime;
    
    // Determine overall health status
    const isHealthy = health.services.docker === "healthy" && 
                     health.services.filesystem === "healthy" &&
                     responseTime < 5000; // Response time under 5 seconds

    return NextResponse.json({
      ...health,
      status: isHealthy ? "healthy" : "degraded",
      responseTime: `${responseTime}ms`
    }, { 
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Health-Check": "true"
      }
    });

  } catch (error) {
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      responseTime: `${Date.now() - startTime}ms`
    }, { 
      status: 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Health-Check": "true"
      }
    });
  }
}