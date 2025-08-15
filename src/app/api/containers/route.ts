import Docker from "dockerode";
import { NextResponse } from "next/server";
import type { Container } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const docker = new Docker(
  process.env.DOCKER_HOST
    ? undefined
    : {
        // Use Windows named pipe when on win32, otherwise Unix socket
        socketPath:
          process.platform === "win32"
            ? "//./pipe/docker_engine"
            : "/var/run/docker.sock",
      }
);

export async function GET() {
  try {
    const [list, versionRaw] = await Promise.all([
      docker.listContainers({ all: true }),
      docker.version().catch(() => ({ Platform: { Name: "docker" } })),
    ]);
    const version = versionRaw as { Platform: { Name?: string } };

    const engineName: Container["engine"] = (() => {
      const name = version?.Platform?.Name?.toLowerCase() || "";
      if (name.includes("rancher")) return "rancher";
      if (name.includes("podman")) return "podman";
      return "docker";
    })();

    const containers: Container[] = await Promise.all(
      list.map(async (c: Docker.ContainerInfo) => {
        let config = "";
        try {
          const inspect = await docker.getContainer(c.Id).inspect();
          config = JSON.stringify(inspect.Config, null, 2);
        } catch {}

        const statusMap: Record<string, Container["status"]> = {
          running: "running",
          exited: "stopped",
          dead: "error",
          paused: "paused",
        };
        const state = (c.State as keyof typeof statusMap) || "exited";
        const health: Container["health"] = c.Status?.includes("(healthy)")
          ? "healthy"
          : c.Status?.includes("(unhealthy)")
          ? "unhealthy"
          : "not-enabled";

        return {
          type: "container",
          id: c.Id,
          name: c.Names?.[0]?.replace(/^\//, "") || c.Id,
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
    return NextResponse.json(containers);
  } catch (err) {
    console.error("Failed to list containers", err);
    return new NextResponse("Failed to list containers", { status: 500 });
  }
}
