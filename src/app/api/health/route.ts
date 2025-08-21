import { NextResponse } from "next/server";
import Docker from "dockerode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  version: string;
  responseTime: string;
  services: {
    docker: "healthy" | "degraded" | "unavailable";
    filesystem: "healthy" | "error";
    api: "healthy" | "error";
  };
  checks: {
    dockerConnection?: {
      status: "pass" | "fail";
      message: string;
      responseTime?: number;
    };
    fileSystemAccess?: {
      status: "pass" | "fail";
      message: string;
    };
    memoryUsage?: {
      status: "pass" | "warn" | "fail";
      message: string;
      usage: number;
    };
  };
  environment?: {
    platform: string;
    dockerHost: string;
    nodeEnv: string;
  };
}

export async function GET() {
  const startTime = Date.now();
  
  const health: HealthCheck = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || "unknown",
    responseTime: "0ms",
    services: {
      docker: "unavailable",
      filesystem: "error",
      api: "healthy"
    },
    checks: {},
    environment: {
      platform: process.platform,
      dockerHost: process.env.DOCKER_HOST || "socket",
      nodeEnv: process.env.NODE_ENV || "development"
    }
  };

  try {
    // Test Docker connectivity with detailed diagnostics
    const dockerCheckStart = Date.now();
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
      
      // Test both ping and version for comprehensive check
      const [pingResult, versionResult] = await Promise.allSettled([
        Promise.race([
          docker.ping(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Ping timeout")), 5000)
          )
        ]),
        Promise.race([
          docker.version(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Version timeout")), 5000)
          )
        ])
      ]);

      const dockerResponseTime = Date.now() - dockerCheckStart;

      if (pingResult.status === "fulfilled") {
        health.services.docker = "healthy";
        health.checks.dockerConnection = {
          status: "pass",
          message: versionResult.status === "fulfilled" 
            ? `Connected to ${(versionResult.value as { Platform?: { Name?: string } })?.Platform?.Name || "Docker"}` 
            : "Connected via ping",
          responseTime: dockerResponseTime
        };
      } else {
        health.services.docker = "unavailable";
        health.checks.dockerConnection = {
          status: "fail",
          message: pingResult.reason instanceof Error 
            ? pingResult.reason.message 
            : "Connection failed",
          responseTime: dockerResponseTime
        };
      }
    } catch (dockerError) {
      health.services.docker = "unavailable";
      health.checks.dockerConnection = {
        status: "fail",
        message: dockerError instanceof Error ? dockerError.message : "Unknown Docker error"
      };
    }

    // Test filesystem access
    try {
      const fs = await import("fs/promises");
      await fs.access("./data", fs.constants.R_OK | fs.constants.W_OK);
      await fs.writeFile("./data/.health-check", "ok");
      await fs.unlink("./data/.health-check");
      
      health.services.filesystem = "healthy";
      health.checks.fileSystemAccess = {
        status: "pass",
        message: "Read/write access confirmed"
      };
    } catch (fsError) {
      health.services.filesystem = "error";
      health.checks.fileSystemAccess = {
        status: "fail",
        message: fsError instanceof Error ? fsError.message : "Filesystem access failed"
      };
    }

    // Memory usage check
    const memoryUsage = (health.memory.heapUsed / health.memory.heapTotal) * 100;
    if (memoryUsage > 90) {
      health.checks.memoryUsage = {
        status: "fail",
        message: "Critical memory usage",
        usage: memoryUsage
      };
    } else if (memoryUsage > 75) {
      health.checks.memoryUsage = {
        status: "warn",
        message: "High memory usage",
        usage: memoryUsage
      };
    } else {
      health.checks.memoryUsage = {
        status: "pass",
        message: "Normal memory usage",
        usage: memoryUsage
      };
    }

    const responseTime = Date.now() - startTime;
    health.responseTime = `${responseTime}ms`;
    
    // Determine overall health status
    const hasFailedChecks = Object.values(health.checks).some(check => check.status === "fail");
    const hasSlowResponse = responseTime > 5000;
    
    if (hasFailedChecks || health.services.filesystem === "error") {
      health.status = "unhealthy";
    } else if (
      health.services.docker === "unavailable" || 
      hasSlowResponse ||
      health.checks.memoryUsage?.status === "warn"
    ) {
      health.status = "degraded";
    } else {
      health.status = "healthy";
    }

    const httpStatus = health.status === "healthy" ? 200 : 503;

    return NextResponse.json(health, { 
      status: httpStatus,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Health-Check": "true",
        "X-Response-Time": health.responseTime
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      responseTime: `${responseTime}ms`,
      services: {
        docker: "unavailable",
        filesystem: "error",
        api: "error"
      }
    }, { 
      status: 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Health-Check": "true"
      }
    });
  }
}
