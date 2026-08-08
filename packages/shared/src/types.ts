export const DEPLOYMENT_STATUSES = [
  "QUEUED",
  "BUILDING",
  "DEPLOYING",
  "LIVE",
  "FAILED",
  "STOPPED",
] as const;

export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];

export type BuildTool = "maven" | "gradle";

export interface UserDto {
  id: string;
  login: string | null;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: string | null;
}

export interface AppDto {
  id: string;
  name: string;
  repoUrl: string;
  branch: string;
  ownerId: string;
  autoDeploy: boolean;
  /** Port the Spring Boot app listens on inside the container */
  port: number;
  memoryMb: number;
  cpus: number;
  url: string | null;
  latestDeployment: DeploymentDto | null;
  createdAt: string;
}

export interface DeploymentDto {
  id: string;
  appId: string;
  status: DeploymentStatus;
  commitSha: string | null;
  commitMessage: string | null;
  imageTag: string | null;
  url: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface RepoDto {
  id: number;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  description: string | null;
  updatedAt: string | null;
}

export interface BranchDto {
  name: string;
  commitSha: string;
}

export interface EnvVarDto {
  key: string;
  /** Values are write-only; the API never returns decrypted values */
  hasValue: true;
}

export interface CreateAppRequest {
  name: string;
  repoFullName: string;
  branch: string;
  port?: number;
  env?: Record<string, string>;
}

export interface UpdateEnvRequest {
  /** Full replacement set; value null removes the key */
  env: Record<string, string | null>;
}

/** Payload of a build job on the BullMQ queue */
export interface BuildJobData {
  deploymentId: string;
  appId: string;
}

export const BUILD_QUEUE_NAME = "builds";
