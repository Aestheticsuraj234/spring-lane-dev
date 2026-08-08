import type {
  AppDto,
  BranchDto,
  CreateAppRequest,
  DeploymentDto,
  DeploymentStatus,
  RepoDto,
} from "@spring-lane/shared";

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      message = body.error ?? message;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  listApps: () => request<{ apps: AppDto[] }>("/apps"),

  getApp: (id: string) => request<{ app: AppDto }>(`/apps/${id}`),

  createApp: (body: CreateAppRequest) =>
    request<{ app: AppDto }>("/apps", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteApp: (id: string) =>
    request<void>(`/apps/${id}`, { method: "DELETE" }),

  listRepos: (q?: string) =>
    request<{ repos: RepoDto[] }>(
      `/repos${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    ),

  listBranches: (owner: string, repo: string) =>
    request<{ branches: BranchDto[] }>(`/repos/${owner}/${repo}/branches`),

  listDeployments: (appId: string) =>
    request<{ deployments: DeploymentDto[] }>(`/apps/${appId}/deployments`),

  deploy: (appId: string) =>
    request<{ deployment: DeploymentDto }>(`/apps/${appId}/deploy`, {
      method: "POST",
    }),

  stop: (appId: string) =>
    request<{ deployment: DeploymentDto }>(`/apps/${appId}/stop`, {
      method: "POST",
    }),

  restart: (appId: string) =>
    request<{ deployment: DeploymentDto }>(`/apps/${appId}/restart`, {
      method: "POST",
    }),

  containerLogs: (appId: string, tail = 200) =>
    request<{ logs: string }>(`/apps/${appId}/logs?tail=${tail}`),

  buildLogs: (appId: string, deploymentId: string) =>
    request<{ logs: string }>(`/apps/${appId}/deployments/${deploymentId}/logs`),
};

export function statusBadgeVariant(
  status: DeploymentStatus,
): "live" | "secondary" | "destructive" | "muted" | "default" {
  switch (status) {
    case "LIVE":
      return "live";
    case "FAILED":
      return "destructive";
    case "QUEUED":
    case "BUILDING":
    case "DEPLOYING":
      return "default";
    case "STOPPED":
      return "muted";
    default:
      return "secondary";
  }
}

export function isActiveDeployment(status: DeploymentStatus): boolean {
  return status === "QUEUED" || status === "BUILDING" || status === "DEPLOYING";
}
