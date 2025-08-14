"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ResourceUsage } from "@/types";

interface ResourceChartProps {
  title: string;
  description: string;
  data: ResourceUsage[];
  dataKey: string;
  color: string;
  unit: string;
}

export function ResourceChart({
  title,
  description,
  data,
  dataKey,
  color,
  unit,
}: ResourceChartProps) {
  const chartConfig = {
    [dataKey]: {
      label: title,
      color: color,
    },
  };

  return (
    <Card className="bg-card/50">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: -20,
              right: 12,
              top: 5,
              bottom: 5,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickCount={5}
              tickFormatter={(value) => typeof value === 'string' ? value.slice(0, 5) : ''}
            />
            <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickCount={3}
                tickFormatter={(value) => `${value}${unit}`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              dataKey="value"
              type="natural"
              fill={color}
              fillOpacity={0.4}
              stroke={color}
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
