import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface LogViewerProps {
  logs: string;
  className?: string;
  title?: string;
  connected?: boolean;
}

export function LogViewer({ logs, className, title, connected }: LogViewerProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className={cn("dotted-frame overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-dotted border-border px-4 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title ?? "Logs"}
        </span>
        {connected !== undefined ? (
          <span
            className={cn(
              "text-xs",
              connected ? "text-primary" : "text-muted-foreground",
            )}
          >
            {connected ? "Live" : "Offline"}
          </span>
        ) : null}
      </div>
      <pre className="log-viewer max-h-[420px] overflow-auto p-4 text-foreground/90">
        {logs || (
          <span className="text-muted-foreground">Waiting for output…</span>
        )}
        <div ref={endRef} />
      </pre>
    </div>
  );
}
