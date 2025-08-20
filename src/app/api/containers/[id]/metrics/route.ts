import Docker from "dockerode";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const docker = new Docker(
  process.env.DOCKER_HOST
    ? undefined
    : {
        socketPath:
          process.platform === "win32" ? "//./pipe/docker_engine" : "/var/run/docker.sock",
      }
);

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const container = docker.getContainer(id);
    const stats = await container.stats({ stream: false });
    const cpuDelta =
      (stats.cpu_stats.cpu_usage.total_usage || 0) -
      (stats.precpu_stats.cpu_usage.total_usage || 0);
    const systemDelta =
      (stats.cpu_stats.system_cpu_usage || 0) -
      (stats.precpu_stats.system_cpu_usage || 0);
    const cores = stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * cores * 100 : 0;
    const memPercent = stats.memory_stats?.usage
      ? (stats.memory_stats.usage / stats.memory_stats.limit) * 100
      : 0;
    return NextResponse.json({
      cpu: Number(Math.max(0, Math.min(100, cpuPercent)).toFixed(2)),
      memory: Number(Math.max(0, Math.min(100, memPercent)).toFixed(2)),
    });
  } catch (err) {
    console.error("Failed to get metrics", err);
    return new NextResponse("Failed to get metrics", { status: 500 });
  }
}
