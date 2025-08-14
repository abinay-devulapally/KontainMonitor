import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "running" | "stopped" | "paused" | "error" | "pending" | "failed";

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    running: {
      label: "Running",
      className: "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30",
    },
    stopped: {
      label: "Stopped",
      className: "bg-stone-500/20 text-stone-400 border-stone-500/30 hover:bg-stone-500/30",
    },
    paused: {
      label: "Paused",
      className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30",
    },
    error: {
      label: "Error",
      className: "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30",
    },
    pending: {
        label: "Pending",
        className: "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30",
    },
    failed: {
        label: "Failed",
        className: "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30",
    }
  };

  const config = statusConfig[status] || statusConfig.stopped;

  return (
    <Badge
      variant="outline"
      className={cn("capitalize", config.className)}
    >
      <div className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: config.className.match(/bg-([a-z]+)-500/)?.[0].replace('bg-', '' )}}/>
      {config.label}
    </Badge>
  );
}
