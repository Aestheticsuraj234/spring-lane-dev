import type { Deployment, App as PrismaApp } from "@spring-lane/db";
import type {
  AppDto,
  BranchDto,
  DeploymentDto,
  DeploymentStatus,
  EnvVarDto,
  RepoDto,
} from "@spring-lane/shared";
import { config } from "../config.js";

export function appUrl(name: string): string {
  const protocol = config.baseDomain === "localhost" ? "http" : "https";
  return `${protocol}://${name}.${config.baseDomain}`;
}

export function toDeploymentDto(deployment: Deployment): DeploymentDto {
  return {
    id: deployment.id,
    appId: deployment.appId,
    status: deployment.status as DeploymentStatus,
    commitSha: deployment.commitSha,
    commitMessage: deployment.commitMessage,
    imageTag: deployment.imageTag,
    url: deployment.url,
    errorMessage: deployment.errorMessage,
    startedAt: deployment.startedAt?.toISOString() ?? null,
    finishedAt: deployment.finishedAt?.toISOString() ?? null,
    createdAt: deployment.createdAt.toISOString(),
  };
}

export function toAppDto(
  app: PrismaApp & { deployments?: Deployment[] },
): AppDto {
  const latest = app.deployments?.[0] ?? null;
  const liveUrl =
    latest?.status === "LIVE" && latest.url
      ? latest.url
      : latest?.status === "LIVE"
        ? appUrl(app.name)
        : null;

  return {
    id: app.id,
    name: app.name,
    repoUrl: `https://github.com/${app.repoFullName}`,
    branch: app.branch,
    projectPath: app.projectPath,
    ownerId: app.ownerId,
    autoDeploy: app.autoDeploy,
    port: app.port,
    memoryMb: app.memoryMb,
    cpus: app.cpus,
    url: liveUrl,
    latestDeployment: latest ? toDeploymentDto(latest) : null,
    createdAt: app.createdAt.toISOString(),
  };
}

export function toRepoDto(repo: {
  id: number;
  full_name: string;
  private: boolean;
  default_branch: string;
  description: string | null;
  updated_at: string | null;
}): RepoDto {
  return {
    id: repo.id,
    fullName: repo.full_name,
    private: repo.private,
    defaultBranch: repo.default_branch,
    description: repo.description,
    updatedAt: repo.updated_at,
  };
}

export function toBranchDto(branch: {
  name: string;
  commit: { sha: string };
}): BranchDto {
  return {
    name: branch.name,
    commitSha: branch.commit.sha,
  };
}

export function toEnvVarDto(key: string): EnvVarDto {
  return { key, hasValue: true };
}

export const APP_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function slugifyAppName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
