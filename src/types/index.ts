export type ResourceUsage = {
  time: string;
  value: number;
};

export type Container = {
  type: "container";
  id: string;
  name: string;
  status: "running" | "stopped" | "paused" | "error";
  image: string;
  engine: "docker" | "rancher" | "podman";
  cpuUsage: ResourceUsage[];
  memoryUsage: ResourceUsage[];
  networkIO: {
    in: ResourceUsage[];
    out: ResourceUsage[];
  };
  logs: string[];
  config: string; // YAML or JSON string
  podId?: string;
};

export type Pod = {
  type: "pod";
  id: string;
  name:string;
  status: "running" | "stopped" | "pending" | "failed";
  containers: string[]; // List of container IDs
  cpuUsage: ResourceUsage[];
  memoryUsage: ResourceUsage[];
  config: string; // YAML or JSON string for the pod
};
