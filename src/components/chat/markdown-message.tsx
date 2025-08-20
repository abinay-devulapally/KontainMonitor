"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";

export function MarkdownMessage({ children }: { children: string }) {
  const [copiedIdx, setCopiedIdx] = React.useState<number | null>(null);

  const components = {
    a({ className, ...props }: React.ComponentPropsWithoutRef<"a">) {
      return (
        <a
          {...props}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "underline underline-offset-4 decoration-muted-foreground hover:decoration-primary text-foreground",
            className
          )}
        />
      );
    },
    img({ className, ...props }: React.ComponentPropsWithoutRef<"img">) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img {...props} className={cn("rounded-md border max-w-full h-auto", className)} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    code({ inline, className, children: codeChildren, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
      const [copied, setCopied] = React.useState(false);
      const raw = String(codeChildren || "");
      let lang = /language-(\w+)/.exec(className || "")?.[1] || "";
      // Heuristic: if block contains Python-y keywords and no lang, assume python
      if (!inline && !lang && /\b(def |import |from |class )/.test(raw)) lang = "python";
      if (inline) {
        return (
          <code className={cn("px-1 py-0.5 rounded bg-muted font-code", className)} {...props}>
            {raw}
          </code>
        );
      }
      return (
        <div className="my-3 rounded-md border overflow-hidden">
          <div className="flex items-center justify-between px-2 py-1 text-xs bg-muted/60 border-b">
            <div className="font-mono text-muted-foreground">{lang || "text"}</div>
            <button
              type="button"
              className={cn("px-2 py-0.5 rounded border", copied ? "bg-primary text-primary-foreground" : "bg-background")}
              onClick={async () => {
                await navigator.clipboard.writeText(raw);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              aria-label="Copy code"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className={cn("p-3 overflow-auto bg-muted font-code text-sm", className, lang ? `language-${lang}` : undefined)}>
            <code className={cn(lang ? `language-${lang}` : undefined)} {...props}>{codeChildren}</code>
          </pre>
        </div>
      );
    },
  } as const;

  return (
    <div className="md-content text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
