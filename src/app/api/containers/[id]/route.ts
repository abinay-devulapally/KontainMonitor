import Docker from "dockerode";
import { NextResponse } from "next/server";
import type { Container } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function mapStatus(state: string): Container["status"] {
  const statusMap: Record<string, Container["status"]> = {
    running: "running",
    exited: "stopped",
    dead: "error",
    paused: "paused",
  };
  return statusMap[state] || "stopped";
}

function mapHealth(health?: { Status?: string }): Container["health"] {
  if (health?.Status === "healthy") return "healthy";
  if (health?.Status === "unhealthy") return "unhealthy";
  return "not-enabled";
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const container = docker.getContainer(params.id);
    const [inspect, stats, logsBuf, version] = await Promise.all([
      container.inspect(),
      container.stats({ stream: false }).catch(() => null),
      container
        .logs({ stdout: true, stderr: true, tail: 100 })
        .catch(() => Buffer.from("")),
      docker.version().catch(() => ({ Platform: { Name: "docker" } })) as any,
    ]);

    const engineName: Container["engine"] = (() => {
      const name = version?.Platform?.Name?.toLowerCase() || "";
      if (name.includes("rancher")) return "rancher";
      if (name.includes("podman")) return "podman";
      return "docker";
    })();

    let cpuPercent = 0;
    let memPercent = 0;
    if (stats) {
      const cpuDelta =
        (stats.cpu_stats.cpu_usage.total_usage || 0) -
        (stats.precpu_stats.cpu_usage.total_usage || 0);
      const systemDelta =
        (stats.cpu_stats.system_cpu_usage || 0) -
        (stats.precpu_stats.system_cpu_usage || 0);
      const cores = stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
      cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * cores * 100 : 0;
      memPercent = stats.memory_stats?.usage
        ? (stats.memory_stats.usage / stats.memory_stats.limit) * 100
        : 0;
    }

    const result: Container = {
      type: "container",
      id: inspect.Id,
      name: inspect.Name?.replace(/^\//, "") || inspect.Id,
      status: mapStatus(inspect.State?.Status || "exited"),
      health: mapHealth(inspect.State?.Health),
      image: inspect.Config?.Image || "",
      engine: engineName,
      cpuUsage: Array.from({ length: 5 }).map((_, i) => ({
        time: new Date(Date.now() - (4 - i) * 60000).toISOString(),
        value: Number(cpuPercent.toFixed(2)),
      })),
      memoryUsage: Array.from({ length: 5 }).map((_, i) => ({
        time: new Date(Date.now() - (4 - i) * 60000).toISOString(),
        value: Number(memPercent.toFixed(2)),
      })),
      networkIO: { in: [], out: [] },
      logs: logsBuf.toString("utf-8").split("\n"),
      config: JSON.stringify(inspect.Config, null, 2),
      podId: undefined,
    };
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to get container", err);
    return new NextResponse("Failed to get container", { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { action } = await req.json();
    const container = docker.getContainer(params.id);
    switch (action) {
      case "start":
        await container.start();
        break;
      case "stop":
        await container.stop();
        break;
      case "restart":
        await container.restart();
        break;
      case "pause":
        await container.pause();
        break;
      case "unpause":
        await container.unpause();
        break;
      case "delete":
        await container.remove({ force: true });
        break;
      default:
        return new NextResponse("Invalid action", { status: 400 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Failed to run action on container", err);
    return new NextResponse("Failed to run action", { status: 500 });
  }
}
