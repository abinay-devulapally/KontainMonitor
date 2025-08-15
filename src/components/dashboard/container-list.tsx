"use client";

import type { Container } from "@/types";
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
import { HealthStatus } from "./health-status";
import { Button } from "../ui/button";

interface ContainerListProps {
  containers: Container[];
  onSelect: (container: Container) => void;
  selectedId?: string;
}

export function ContainerList({
  containers,
  onSelect,
  selectedId,
}: ContainerListProps) {
  return (
    <ScrollArea className="h-[calc(100vh-10rem)] rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm">
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Image</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Health</TableHead>
            <TableHead>Engine</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {containers.map((container) => (
            <TableRow
              key={container.id}
              onClick={() => onSelect(container)}
              className={cn("cursor-pointer", selectedId === container.id && "bg-accent/50")}
            >
              <TableCell className="font-medium truncate max-w-[200px]">{container.name}</TableCell>
              <TableCell className="truncate max-w-xs">{container.image}</TableCell>
              <TableCell>
                <StatusBadge status={container.status} />
              </TableCell>
              <TableCell>
                <HealthStatus status={container.health} />
              </TableCell>
              <TableCell className="capitalize">{container.engine}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onSelect(container)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
