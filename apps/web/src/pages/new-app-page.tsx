import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/layout/app-shell";
import { api } from "@/lib/api";
import type { BranchDto, RepoDto } from "@spring-lane/shared";

interface NewAppPageProps {
  user: {
    name?: string | null;
    email?: string;
    image?: string | null;
  };
}

export function NewAppPage({ user }: NewAppPageProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [port, setPort] = useState("8080");
  const [projectPath, setProjectPath] = useState("");
  const [repoQuery, setRepoQuery] = useState("");
  const [repos, setRepos] = useState<RepoDto[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<RepoDto | null>(null);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [branch, setBranch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadRepos(repoQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [repoQuery]);

  async function loadRepos(q: string) {
    setReposLoading(true);
    try {
      const { repos: data } = await api.listRepos(q || undefined);
      setRepos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load repos");
    } finally {
      setReposLoading(false);
    }
  }

  async function selectRepo(repo: RepoDto) {
    setSelectedRepo(repo);
    setBranch(repo.defaultBranch);
    setError(null);
    try {
      const [owner, repoName] = repo.fullName.split("/");
      if (!owner || !repoName) return;
      const { branches: data } = await api.listBranches(owner, repoName);
      setBranches(data);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load branches");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRepo || !branch || !name.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const { app } = await api.createApp({
        name: name.trim(),
        repoFullName: selectedRepo.fullName,
        branch,
        projectPath: projectPath.trim() || undefined,
        port: Number(port) || 8080,
      });
      navigate(`/apps/${app.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create app");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell user={user}>
      <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          Back to apps
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">New app</h1>
        <p className="mt-1 text-muted-foreground">
          Step {step} of 2 — {step === 1 ? "Pick a repository" : "Configure deploy"}
        </p>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      {step === 1 ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Select repository</CardTitle>
            <CardDescription>
              Repos you have access to on GitHub.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Filter repositories…"
                value={repoQuery}
                onChange={(e) => setRepoQuery(e.target.value)}
              />
            </div>
            <div className="max-h-80 space-y-2 overflow-auto">
              {reposLoading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading repos…
                </div>
              ) : repos.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No repositories found.
                </p>
              ) : (
                repos.map((repo) => (
                  <button
                    key={repo.id}
                    type="button"
                    className="flex w-full items-start justify-between rounded-md border border-dotted border-border px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/50"
                    onClick={() => void selectRepo(repo)}
                  >
                    <div>
                      <p className="font-medium">{repo.fullName}</p>
                      {repo.description ? (
                        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                          {repo.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {repo.defaultBranch}
                    </span>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="max-w-lg space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>App settings</CardTitle>
              <CardDescription className="font-mono text-xs">
                {selectedRepo?.fullName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">App name</Label>
                <Input
                  id="name"
                  placeholder="my-service"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Becomes the subdomain: my-service.localhost
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.name} value={b.name}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectPath">Project path</Label>
                <Input
                  id="projectPath"
                  placeholder="app/app"
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Relative path inside the repo where pom.xml lives. Leave blank for repo root.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="port">Container port</Label>
                <Input
                  id="port"
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create app"
              )}
            </Button>
          </div>
        </form>
      )}
    </AppShell>
  );
}
