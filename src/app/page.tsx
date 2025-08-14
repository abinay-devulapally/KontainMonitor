"use client";

import * as React from "react";
import { MainLayout } from "@/components/main-layout";
import { ContainerList } from "@/components/dashboard/container-list";
import { PodList } from "@/components/dashboard/pod-list";
import { DetailsPanel } from "@/components/dashboard/details-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { containers, pods } from "@/lib/mock-data";
import type { Container, Pod } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardPage() {
  const [selectedItem, setSelectedItem] = React.useState<Container | Pod | null>(
    containers[0]
  );
  
  const handleSelectItem = (item: Container | Pod) => {
    setSelectedItem(item);
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
          </Tabs>
        </div>
        <div className="xl:col-span-2 h-full overflow-hidden">
          <DetailsPanel item={selectedItem} />
        </div>
      </div>
    </MainLayout>
  );
}
