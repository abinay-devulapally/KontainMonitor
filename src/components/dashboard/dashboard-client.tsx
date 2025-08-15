"use client";

import * as React from "react";
import { MainLayout } from "@/components/main-layout";
import { ContainerList } from "@/components/dashboard/container-list";
import { PodList } from "@/components/dashboard/pod-list";
import { DetailsPanel } from "@/components/dashboard/details-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Container, Pod } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "../ui/input";
import { Search } from "lucide-react";

export function DashboardClient({
  initialTab = "containers",
}: {
  initialTab?: "containers" | "pods";
}) {
  const [containers, setContainers] = React.useState<Container[]>([]);
  const [pods, setPods] = React.useState<Pod[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<
    Container | Pod | null
  >(null);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");

  React.useEffect(() => {
    async function fetchData() {
      try {
        const [containersRes, podsRes] = await Promise.all([
          fetch("/api/containers"),
          fetch("/api/pods"),
        ]);
        const containersData: Container[] = await containersRes.json();
        const podsData: Pod[] = await podsRes.json();
        setContainers(containersData);
        setPods(podsData);
        if (containersData.length > 0) {
          setSelectedItem(containersData[0]);
        } else if (podsData.length > 0) {
          setSelectedItem(podsData[0]);
        }
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSelectItem = async (item: Container | Pod) => {
    if (item.type === "container") {
      try {
        const res = await fetch(`/api/containers/${item.id}`);
        const detailed = (await res.json()) as Container;
        setSelectedItem(detailed);
        setContainers((prev) =>
          prev.map((c) => (c.id === detailed.id ? detailed : c))
        );
        return;
      } catch (err) {
        console.error("Failed to load container details", err);
      }
    }
    setSelectedItem(item);
  };

  const handleUpdateItem = (updatedItem: Container | Pod) => {
    if (updatedItem.type === "container") {
      setContainers((prev) =>
        prev.map((c) => (c.id === updatedItem.id ? (updatedItem as Container) : c))
      );
    } else {
      setPods((prev) =>
        prev.map((p) => (p.id === updatedItem.id ? (updatedItem as Pod) : p))
      );
    }
    setSelectedItem(updatedItem);
  };

  const filteredContainers = containers.filter((container) =>
    container.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPods = pods.filter((pod) =>
    pod.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 p-4 h-[calc(100vh-2rem)]">
        <div className="xl:col-span-3 h-full flex flex-col">
          <Tabs defaultValue={initialTab} className="flex-grow flex flex-col">
            <div className="flex justify-between items-center gap-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="containers">Containers</TabsTrigger>
                <TabsTrigger value="pods">Pods</TabsTrigger>
              </TabsList>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {loading ? (
              <div className="flex-grow mt-4 overflow-hidden">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                <TabsContent
                  value="containers"
                  className="flex-grow mt-4 overflow-hidden"
                >
                  <ContainerList
                    containers={filteredContainers}
                    onSelect={handleSelectItem}
                    selectedId={selectedItem?.id}
                  />
                </TabsContent>
                <TabsContent
                  value="pods"
                  className="flex-grow mt-4 overflow-hidden"
                >
                  <PodList
                    pods={filteredPods}
                    onSelect={handleSelectItem}
                    selectedId={selectedItem?.id}
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
        <div className="xl:col-span-2 h-full overflow-hidden">
          <DetailsPanel item={selectedItem} onItemUpdate={handleUpdateItem} />
        </div>
      </div>
    </MainLayout>
  );
}
