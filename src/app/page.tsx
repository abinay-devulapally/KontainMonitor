"use client";

import * as React from "react";
import { MainLayout } from "@/components/main-layout";
import { ContainerList } from "@/components/dashboard/container-list";
import { PodList } from "@/components/dashboard/pod-list";
import { DetailsPanel } from "@/components/dashboard/details-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getContainers, getPods } from "@/lib/mock-data";
import type { Container, Pod } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [containers, setContainers] = React.useState<Container[]>([]);
  const [pods, setPods] = React.useState<Pod[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<Container | Pod | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    // Fetch data on the client to ensure it's consistent and avoids hydration errors.
    const containersData = getContainers();
    const podsData = getPods();
    setContainers(containersData);
    setPods(podsData);
    setSelectedItem(containersData[0]);
    setLoading(false);
  }, []);

  const handleSelectItem = (item: Container | Pod) => {
    setSelectedItem(item);
  };
  
  const handleUpdateItem = (updatedItem: Container | Pod) => {
    if (updatedItem.type === 'container') {
      setContainers(prev => prev.map(c => c.id === updatedItem.id ? updatedItem as Container : c));
    } else {
      setPods(prev => prev.map(p => p.id === updatedItem.id ? updatedItem as Pod : p));
    }
    setSelectedItem(updatedItem);
  };

  return (
    <MainLayout>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 p-4 h-[calc(100vh-2rem)]">
        <div className="xl:col-span-3 h-full flex flex-col">
          <Tabs defaultValue="containers" className="flex-grow flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="containers">Containers</TabsTrigger>
              <TabsTrigger value="pods">Pods</TabsTrigger>
            </TabsList>
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
                <TabsContent value="containers" className="flex-grow mt-4 overflow-hidden">
                    <ContainerList
                      containers={containers}
                      onSelect={handleSelectItem}
                      selectedId={selectedItem?.id}
                    />
                </TabsContent>
                <TabsContent value="pods" className="flex-grow mt-4 overflow-hidden">
                    <PodList
                      pods={pods}
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
