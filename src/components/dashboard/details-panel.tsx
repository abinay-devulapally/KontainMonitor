"use client";

import type { Container, Pod } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Play,
  StopCircle,
  RefreshCw,
  Trash2,
  Pause,
  Info,
  Terminal,
  FileCode,
  Zap,
} from "lucide-react";
import { StatusBadge } from "./status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResourceChart } from "./resource-chart";
import { RecommendationsTab } from "./recommendations-tab";
import { HealthStatus } from "./health-status";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import * as React from "react";

interface DetailsPanelProps {
  item: Container | Pod | null;
  onItemUpdate: (item: Container | Pod) => void;
}

export function DetailsPanel({ item, onItemUpdate }: DetailsPanelProps) {
    const [isActionAlertOpen, setIsActionAlertOpen] = React.useState(false);
    const [actionToConfirm, setActionToConfirm] = React.useState<(() => void) | null>(null);
    const [alertTitle, setAlertTitle] = React.useState("");
    const [alertDescription, setAlertDescription] = React.useState("");


  if (!item) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Info className="mx-auto h-12 w-12" />
          <p className="mt-4">Select a container or pod to see details</p>
        </div>
      </Card>
    );
  }

  const handleAction = (
    actionFn: () => Partial<Container | Pod>,
    title: string,
    description: string
  ) => {
    setActionToConfirm(() => () => {
        const updates = actionFn();
        onItemUpdate({ ...item, ...updates } as Container | Pod);
    });
    setAlertTitle(title);
    setAlertDescription(description);
    setIsActionAlertOpen(true);
  };
  
  const confirmAction = () => {
    if (actionToConfirm) {
        actionToConfirm();
    }
    setIsActionAlertOpen(false);
    setActionToConfirm(null);
  };


  const isContainer = item.type === "container";
  const itemAsContainer = item as Container;

  const controlButtons = (
    <div className="flex gap-2">
      <Button variant="ghost" size="icon" aria-label="Start" onClick={() => handleAction(() => ({ status: 'running' }), "Start Container?", `Are you sure you want to start ${item.name}?`)} disabled={item.status === 'running'}>
        <Play className="h-4 w-4 text-green-500" />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Pause" onClick={() => handleAction(() => ({ status: 'paused' }), "Pause Container?", `Are you sure you want to pause ${item.name}?`)} disabled={item.status !== 'running'}>
        <Pause className="h-4 w-4 text-yellow-500" />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Stop" onClick={() => handleAction(() => ({ status: 'stopped' }), "Stop Container?", `Are you sure you want to stop ${item.name}?`)} disabled={item.status === 'stopped'}>
        <StopCircle className="h-4 w-4 text-red-500" />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Restart" onClick={() => handleAction(() => ({ status: 'running' }), "Restart Container?", `Are you sure you want to restart ${item.name}?`)}>
        <RefreshCw className="h-4 w-4 text-blue-500" />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => handleAction(() => ({ status: 'stopped' }), "Delete Container?", `Are you sure you want to delete ${item.name}? This action cannot be undone.`)}>
        <Trash2 className="h-4 w-4 text-gray-500" />
      </Button>
    </div>
  );
  
    const podControlButtons = (
    <div className="flex gap-2">
      <Button variant="ghost" size="icon" aria-label="Start Pod" onClick={() => handleAction(() => ({ status: 'running' }), "Start Pod?", `Are you sure you want to start ${item.name}?`)} disabled={item.status === 'running'}>
        <Play className="h-4 w-4 text-green-500" />
      </Button>
       <Button variant="ghost" size="icon" aria-label="Stop Pod" onClick={() => handleAction(() => ({ status: 'stopped' }), "Stop Pod?", `Are you sure you want to stop ${item.name}?`)} disabled={item.status === 'stopped' || item.status === 'failed'}>
        <StopCircle className="h-4 w-4 text-red-500" />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Restart Pod" onClick={() => handleAction(() => ({ status: 'running' }), "Restart Pod?", `Are you sure you want to restart ${item.name}?`)}>
        <RefreshCw className="h-4 w-4 text-blue-500" />
      </Button>
       <Button variant="ghost" size="icon" aria-label="Delete Pod" onClick={() => handleAction(() => ({ status: 'stopped' }), "Delete Pod?", `Are you sure you want to delete ${item.name}? This action cannot be undone.`)}>
        <Trash2 className="h-4 w-4 text-gray-500" />
      </Button>
    </div>
  );


  return (
    <>
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl font-headline break-all">
              {item.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusBadge status={item.status} />
              <span className="capitalize">{item.type}</span>
              {isContainer && (
                <>
                    <span className="capitalize">({itemAsContainer.engine})</span>
                    <HealthStatus status={itemAsContainer.health} />
                </>
              )}
            </CardDescription>
          </div>
          {isContainer ? controlButtons : podControlButtons}
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <Tabs defaultValue="overview" className="h-full flex flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">
              <Info className="mr-2 h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex-1">
              <Terminal className="mr-2 h-4 w-4" /> Logs
            </TabsTrigger>
            <TabsTrigger value="config" className="flex-1">
              <FileCode className="mr-2 h-4 w-4" /> Config
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex-1">
              <Zap className="mr-2 h-4 w-4" /> AI
            </TabsTrigger>
          </TabsList>
          <ScrollArea className="flex-grow mt-4">
            <TabsContent value="overview">
              <div className="space-y-4">
                {isContainer && itemAsContainer.image && (
                    <div className="text-sm">
                        <p className="text-muted-foreground">Image</p>
                        <p>{itemAsContainer.image}</p>
                    </div>
                )}
                <ResourceChart
                  title="CPU Usage"
                  description="Average CPU utilization over time."
                  data={item.cpuUsage}
                  dataKey="value"
                  color="hsl(var(--chart-1))"
                  unit="%"
                />
                <ResourceChart
                  title="Memory Usage"
                  description="Average memory consumption."
                  data={item.memoryUsage}
                  dataKey="value"
                  color="hsl(var(--chart-2))"
                  unit="%"
                />
              </div>
            </TabsContent>
            <TabsContent value="logs">
              <Card className="bg-card/50">
                <CardContent className="p-4">
                  <pre className="font-code text-sm text-muted-foreground whitespace-pre-wrap">
                    {isContainer
                      ? itemAsContainer.logs.join("\n")
                      : "Pod-level logs are an aggregation of container logs."}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="config">
              <Card className="bg-card/50">
                <CardContent className="p-4">
                  <pre className="font-code text-sm text-muted-foreground whitespace-pre-wrap">
                    {item.config}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="recommendations">
                <RecommendationsTab item={item} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
     <AlertDialog open={isActionAlertOpen} onOpenChange={setIsActionAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>{alertTitle}</AlertDialogTitle>
            <AlertDialogDescription>
                {alertDescription}
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
