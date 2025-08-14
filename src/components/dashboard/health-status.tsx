import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HealthStatus as HealthStatusType } from "@/types";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

interface HealthStatusProps {
  status: HealthStatusType;
}

export function HealthStatus({ status }: HealthStatusProps) {
  const statusConfig = {
    healthy: {
      label: "Healthy",
      className: "bg-green-500/20 text-green-400 border-green-500/30",
      icon: <ShieldCheck className="h-3 w-3 text-green-400" />,
    },
    unhealthy: {
      label: "Unhealthy",
      className: "bg-red-500/20 text-red-400 border-red-500/30",
      icon: <ShieldAlert className="h-3 w-3 text-red-400" />,
    },
    "not-enabled": {
      label: "Not Enabled",
      className: "bg-stone-500/20 text-stone-400 border-stone-500/30",
      icon: <ShieldX className="h-3 w-3 text-stone-400" />,
    },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn("capitalize items-center gap-1.5", config.className)}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}
