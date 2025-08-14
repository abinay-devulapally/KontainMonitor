"use client";

import type { Pod } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PodListProps {
  pods: Pod[];
  onSelect: (pod: Pod) => void;
  selectedId?: string;
}

export function PodList({ pods, onSelect, selectedId }: PodListProps) {
  return (
    <ScrollArea className="h-[calc(100vh-10rem)] rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm">
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Containers</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pods.map((pod) => (
            <TableRow
              key={pod.id}
              onClick={() => onSelect(pod)}
              className={cn("cursor-pointer", selectedId === pod.id && "bg-accent/50")}
            >
              <TableCell className="font-medium">{pod.name}</TableCell>
              <TableCell>
                <StatusBadge status={pod.status} />
              </TableCell>
              <TableCell>{pod.containers.length}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
