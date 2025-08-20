"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";

export function MarkdownMessage({ children }: { children: string }) {
  const CodeBlock = ({ inline, className, children: codeChildren, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) => {
    const [copied, setCopied] = React.useState(false);
    const raw = String(codeChildren || "");
    const lang =
      /language-(\w+)/.exec(className || "")?.[1] ||
      (!inline && /\b(def |import |from |class )/.test(raw) ? "python" : "");
    if (inline) {
      return (
        <code className={cn("px-1 py-0.5 rounded bg-muted font-code", className)} {...props}>
          {raw}
        </code>
      );
    }
    return (
      <div className="my-3 rounded-md border overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/60 px-2 py-1 text-xs">
          <span className="font-mono text-muted-foreground">{lang || "text"}</span>
          <button
            type="button"
            className={cn(
              "rounded border px-2 py-0.5 transition-all duration-200 hover:scale-105",
              copied ? "bg-primary text-primary-foreground shadow-md" : "bg-background hover:bg-accent"
            )}
            onClick={async () => {
              await navigator.clipboard.writeText(raw);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            aria-label="Copy code"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <pre className={cn("overflow-x-auto bg-muted p-3 font-code text-sm max-w-full", className)}>
          <code className={cn("whitespace-pre", className)} {...props}>
            {codeChildren}
          </code>
        </pre>
      </div>
    );
  };

  const components = {
    p({ className, children, ...props }: React.ComponentPropsWithoutRef<"p">) {
      // Prevent p tags from wrapping block elements
      return (
        <div className={cn("my-3", className)} {...props}>
          {children}
        </div>
      );
    },
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
    img({ className, alt, ...props }: React.ComponentPropsWithoutRef<"img"> & { alt?: string }) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img {...props} alt={alt || ""} className={cn("rounded-md border max-w-full h-auto", className)} />;
    },
    code: CodeBlock,
  } as const;

  return (
    <div className="md-content text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
