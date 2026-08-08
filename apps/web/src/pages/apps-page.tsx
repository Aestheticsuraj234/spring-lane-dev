import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Rocket, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/layout/app-shell";
import { api, statusBadgeVariant } from "@/lib/api";
import type { AppDto } from "@spring-lane/shared";

interface AppsPageProps {
  user: {
    name?: string | null;
    email?: string;
    image?: string | null;
  };
}

export function AppsPage({ user }: AppsPageProps) {
  const [apps, setApps] = useState<AppDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadApps();
  }, []);

  async function loadApps() {
    setLoading(true);
    setError(null);
    try {
      const { apps: data } = await api.listApps();
      setApps(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load apps");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}" and its containers?`)) return;
    try {
      await api.deleteApp(id);
      setApps((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <AppShell user={user}>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Your apps</h1>
        <p className="mt-1 text-muted-foreground">
          Spring Boot services deployed from GitHub.
        </p>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-destructive">{error}</p>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No apps yet</CardTitle>
            <CardDescription>
              Register a GitHub repo to deploy your first Spring Boot service.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/apps/new">
                <Rocket className="h-4 w-4" />
                Create your first app
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {apps.map((app) => (
            <Card key={app.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      <Link
                        to={`/apps/${app.id}`}
                        className="hover:text-primary"
                      >
                        {app.name}
                      </Link>
                    </CardTitle>
                    <CardDescription className="mt-1 font-mono text-xs">
                      {app.repoUrl.replace("https://github.com/", "")}@
                      {app.branch}
                    </CardDescription>
                  </div>
                  {app.latestDeployment ? (
                    <Badge variant={statusBadgeVariant(app.latestDeployment.status)}>
                      {app.latestDeployment.status}
                    </Badge>
                  ) : (
                    <Badge variant="muted">NEW</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between pt-0">
                {app.url ? (
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {app.url.replace(/^https?:\/\//, "")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">Not deployed</span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => void handleDelete(app.id, app.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
