import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  Square,
  Terminal,
} from "lucide-react";
import type { AppDto, DeploymentDto } from "@spring-lane/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { LogViewer } from "@/components/log-viewer";
import { AppShell } from "@/components/layout/app-shell";
import { useDeploymentLogs } from "@/hooks/use-deployment-logs";
import { api, isActiveDeployment, statusBadgeVariant } from "@/lib/api";

interface AppDetailPageProps {
  appId: string;
  user: {
    name?: string | null;
    email?: string;
    image?: string | null;
  };
}

export function AppDetailPage({ user, appId }: AppDetailPageProps) {
  const [app, setApp] = useState<AppDto | null>(null);
  const [deployments, setDeployments] = useState<DeploymentDto[]>([]);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string | null>(null);
  const [historicalLogs, setHistoricalLogs] = useState("");
  const [containerLogs, setContainerLogs] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logTab, setLogTab] = useState<"build" | "container">("build");

  const activeDeployment = deployments.find((d) => isActiveDeployment(d.status));
  const liveDeployment = deployments.find((d) => d.status === "LIVE");
  const watchId = activeDeployment?.id ?? selectedDeploymentId;

  const { logs: liveLogs, connected, status: liveStatus } = useDeploymentLogs({
    deploymentId: watchId,
    enabled: Boolean(watchId && (activeDeployment || logTab === "build")),
    initialLogs: historicalLogs,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ app: appData }, { deployments: deploymentData }] = await Promise.all([
        api.getApp(appId),
        api.listDeployments(appId),
      ]);
      setApp(appData);
      setDeployments(deploymentData);

      const latest = deploymentData[0] ?? appData.latestDeployment;
      if (latest) {
        setSelectedDeploymentId(latest.id);
        try {
          const { logs } = await api.buildLogs(appId, latest.id);
          setHistoricalLogs(logs);
        } catch {
          setHistoricalLogs("");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load app");
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (liveStatus?.status) {
      void load();
    }
  }, [liveStatus?.status, load]);

  async function runAction(
    key: string,
    fn: () => Promise<unknown>,
  ) {
    setActionLoading(key);
    try {
      await fn();
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function loadContainerLogs() {
    setLogTab("container");
    try {
      const { logs } = await api.containerLogs(appId);
      setContainerLogs(logs);
    } catch (err) {
      setContainerLogs(
        err instanceof Error ? err.message : "Failed to load container logs",
      );
    }
  }

  if (loading) {
    return (
      <AppShell user={user}>
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  if (!app) {
    return (
      <AppShell user={user}>
        <p className="text-destructive">{error ?? "App not found"}</p>
      </AppShell>
    );
  }

  const displayBuildLogs = activeDeployment ? liveLogs : liveLogs || historicalLogs;

  return (
    <AppShell user={user}>
      <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          All apps
        </Link>
      </Button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{app.name}</h1>
            {app.latestDeployment ? (
              <Badge variant={statusBadgeVariant(app.latestDeployment.status)}>
                {app.latestDeployment.status}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {app.repoUrl.replace("https://github.com/", "")}@{app.branch}
          </p>
          {app.url ? (
            <a
              href={app.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {app.url}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={Boolean(actionLoading) || Boolean(activeDeployment)}
            onClick={() =>
              void runAction("deploy", () => api.deploy(appId))
            }
          >
            {actionLoading === "deploy" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Deploy
          </Button>
          {liveDeployment ? (
            <>
              <Button
                variant="outline"
                disabled={Boolean(actionLoading)}
                onClick={() =>
                  void runAction("restart", () => api.restart(appId))
                }
              >
                {actionLoading === "restart" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Restart
              </Button>
              <Button
                variant="outline"
                disabled={Boolean(actionLoading)}
                onClick={() =>
                  void runAction("stop", () => api.stop(appId))
                }
              >
                {actionLoading === "stop" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Stop
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={logTab === "build" ? "default" : "outline"}
              onClick={() => setLogTab("build")}
            >
              <Terminal className="h-4 w-4" />
              Build logs
            </Button>
            <Button
              size="sm"
              variant={logTab === "container" ? "default" : "outline"}
              onClick={() => void loadContainerLogs()}
              disabled={!liveDeployment}
            >
              Container logs
            </Button>
          </div>

          {logTab === "build" ? (
            <LogViewer
              title="Build output"
              logs={displayBuildLogs}
              connected={Boolean(activeDeployment && connected)}
            />
          ) : (
            <LogViewer title="Container stdout/stderr" logs={containerLogs} />
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deployments</CardTitle>
            <CardDescription>Recent deploy history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {deployments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deployments yet.</p>
            ) : (
              deployments.map((d, i) => (
                <div key={d.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left text-sm"
                    onClick={() => {
                      setSelectedDeploymentId(d.id);
                      void api.buildLogs(appId, d.id).then(({ logs }) => {
                        setHistoricalLogs(logs);
                        setLogTab("build");
                      });
                    }}
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(d.createdAt).toLocaleString()}
                    </span>
                    <Badge variant={statusBadgeVariant(d.status)}>{d.status}</Badge>
                  </button>
                  {d.commitMessage ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {d.commitMessage}
                    </p>
                  ) : null}
                  {i < deployments.length - 1 ? (
                    <Separator className="mt-3" />
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
