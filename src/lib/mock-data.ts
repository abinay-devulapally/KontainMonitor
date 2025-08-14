import type { Container, Pod } from "@/types";

const generateResourceHistory = (points: number, max: number, min = 0) => {
  if (typeof window === "undefined") return [];
  return Array.from({ length: points }, (_, i) => ({
    time: new Date(Date.now() - (points - i) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    value: Math.floor(Math.random() * (max - min + 1)) + min,
  }));
};

export const getContainers = (): Container[] => [
  {
    type: "container",
    id: "c1",
    name: "webapp-prod-1",
    status: "running",
    health: "healthy",
    image: "nginx:latest",
    engine: "docker",
    cpuUsage: generateResourceHistory(30, 85, 40),
    memoryUsage: generateResourceHistory(30, 70, 50),
    networkIO: {
      in: generateResourceHistory(30, 5, 1),
      out: generateResourceHistory(30, 20, 5),
    },
    logs: [
      '2024-07-29T10:00:00Z [info] Starting up...',
      '2024-07-29T10:00:01Z [info] Listening on port 80',
      '2024-07-29T10:05:21Z [access] 192.168.1.10 - "GET / HTTP/1.1" 200',
    ],
    config: `
apiVersion: v1
kind: Pod
metadata:
  name: webapp-prod-1
spec:
  containers:
  - name: webapp-prod-1
    image: nginx:latest
    resources:
      limits:
        memory: "128Mi"
        cpu: "500m"
    ports:
    - containerPort: 80
`,
    podId: "p1",
  },
  {
    type: "container",
    id: "c2",
    name: "database-main",
    status: "running",
    health: "unhealthy",
    image: "postgres:14",
    engine: "docker",
    cpuUsage: generateResourceHistory(30, 40, 10),
    memoryUsage: generateResourceHistory(30, 95, 80), // High memory usage
    networkIO: {
      in: generateResourceHistory(30, 50, 20),
      out: generateResourceHistory(30, 50, 20),
    },
    logs: [
        '2024-07-29T09:30:00Z [info] Database system is ready to accept connections',
        '2024-07-29T10:15:10Z [warning] Long running query detected',
    ],
    config: `
apiVersion: v1
kind: Pod
metadata:
  name: database-main
spec:
  containers:
  - name: database-main
    image: postgres:14
    resources:
      requests:
        memory: "256Mi"
        cpu: "1"
      limits:
        memory: "512Mi"
        cpu: "2"
`,
    podId: "p1",
  },
  {
    type: "container",
    id: "c3",
    name: "worker-queue",
    status: "error",
    health: "unhealthy",
    image: "redis:alpine",
    engine: "rancher",
    cpuUsage: generateResourceHistory(30, 98, 90), // High CPU
    memoryUsage: generateResourceHistory(30, 60, 40),
    networkIO: {
      in: generateResourceHistory(30, 10, 2),
      out: generateResourceHistory(30, 10, 2),
    },
    logs: [
      '2024-07-29T11:00:00Z [error] OOMKilled: process terminated',
      '2024-07-29T11:00:01Z [info] Restarting container...',
    ],
    config: `
apiVersion: v1
kind: Pod
metadata:
  name: worker-queue
spec:
  containers:
  - name: worker-queue
    image: redis:alpine
    resources:
      limits:
        memory: "64Mi"
        cpu: "250m"
`,
    podId: "p2",
  },
  {
    type: "container",
    id: "c4",
    name: "legacy-app",
    status: "stopped",
    health: "not-enabled",
    image: "ubuntu:18.04",
    engine: "podman",
    cpuUsage: generateResourceHistory(30, 0, 0),
    memoryUsage: generateResourceHistory(30, 0, 0),
    networkIO: {
      in: generateResourceHistory(30, 0, 0),
      out: generateResourceHistory(30, 0, 0),
    },
    logs: [
      '2024-07-28T14:00:00Z [info] Container stopped by user.',
    ],
    config: `
# No config for stopped container
`,
  },
];

export const getPods = (): Pod[] => [
  {
    type: "pod",
    id: "p1",
    name: "production-stack",
    status: "running",
    containers: ["c1", "c2"],
    cpuUsage: generateResourceHistory(30, 60, 20),
    memoryUsage: generateResourceHistory(30, 80, 60),
    config: `
apiVersion: v1
kind: Pod
metadata:
  name: production-stack
  labels:
    app: my-app
spec:
  # Pod spec here...
`
  },
  {
    type: "pod",
    id: "p2",
    name: "worker-pool",
    status: "failed",
    containers: ["c3"],
    cpuUsage: generateResourceHistory(30, 0, 0),
    memoryUsage: generateResourceHistory(30, 0, 0),
    config: `
apiVersion: v1
kind: Pod
metadata:
  name: worker-pool
spec:
  # Pod spec here...
`
  },
];
