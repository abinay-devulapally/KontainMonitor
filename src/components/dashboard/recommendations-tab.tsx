"use client";

import * as React from "react";
import type { Container, Pod } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAiSuggestions } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, Terminal, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RecommendationsTabProps {
  item: Container | Pod;
}

export function RecommendationsTab({ item }: RecommendationsTabProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<
    { suggestions: { suggestion: string; rationale: string }[] } | null
  >(null);

  const apiKeyRef = React.useRef("");
  const modelRef = React.useRef("gemini-2.0-flash");

  React.useEffect(() => {
    apiKeyRef.current = localStorage.getItem("aiApiKey") || "";
    modelRef.current = localStorage.getItem("aiModel") || "gemini-2.0-flash";
  }, []);

  const handleGetRecommendations = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await getAiSuggestions(
        item,
        apiKeyRef.current,
        modelRef.current
      );
      setResult(response);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-4">
        <h3 className="font-semibold text-lg">AI-Powered Recommendations</h3>
        <p className="text-muted-foreground text-sm">
          Analyze resource usage and configuration to get smart suggestions for
          improving performance and stability.
        </p>
        <Button onClick={handleGetRecommendations} disabled={loading}>
          <Zap className="mr-2 h-4 w-4" />
          {loading ? "Analyzing..." : "Generate Suggestions"}
        </Button>
      </div>

      {loading && (
        <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Analysis Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="text-yellow-400" />
                Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-4 space-y-2 text-muted-foreground">
                {result.suggestions.map((s, idx) => (
                  <li key={idx}>{s.suggestion}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal />
                Rationale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-4 space-y-2 text-muted-foreground">
                {result.suggestions.map((s, idx) => (
                  <li key={idx}>{s.rationale}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
