# **App Name**: KontainMonitor

## Core Features:

- Container Listing: Display a list of running containers, across any supported container engine (Docker Desktop, Rancher, etc).
- Container Details: Show detailed information about each container, including resource usage (CPU, memory, network), logs, and configuration.
- Container Controls: Provide controls to start, stop, restart, pause, and delete containers.
- Pod Listing: Show a list of pods. Note that depending on the underlying system, some containers may not belong to a pod.
- Pod Details: Show detailed information about each pod, similar to containers.
- Resource Monitoring: Display current and historical resource utilization using charts and graphs. Use tooltips to explain the current resource constraints on each resource (CPU, memory, etc).
- Smart Recommendations: Suggest fixes and improvements based on container and pod configurations. For instance, if a container has a CPU usage consistently over 90% or has hit an OOM error, suggest to tool additional CPU/RAM.

## Style Guidelines:

- Primary color: Dark Purple (#4A148C) for a sophisticated and modern feel.
- Background color: Very dark gray (#121212) for a dark theme that's easy on the eyes.
- Accent color: Teal (#008080) to provide clear highlights and a sense of calm amidst technical information.
- Body and headline font: 'Inter', sans-serif, for a clean and modern look.
- Code font: 'Source Code Pro' for displaying logs and configurations.
- Use clear, minimalist icons from a set like Phosphor or Tabler Icons.
- Use a grid-based layout with clear separation between sections for easy navigation.
- Use subtle animations and transitions to enhance user experience without being distracting.