import type { DeploymentStatus } from "./types.js";

/** Redis pub/sub channel carrying live log chunks for a deployment */
export const logChannel = (deploymentId: string) => `logs:${deploymentId}`;

/** Redis pub/sub channel carrying deployment status changes */
export const statusChannel = () => "deployment-status";

/** Socket.IO room for a deployment's live logs */
export const deploymentRoom = (deploymentId: string) => `deployment:${deploymentId}`;

/** Socket.IO event names shared between api and web */
export const SOCKET_EVENTS = {
  /** client -> server: subscribe to a deployment's log stream */
  subscribeDeployment: "deployment:subscribe",
  /** client -> server: unsubscribe */
  unsubscribeDeployment: "deployment:unsubscribe",
  /** server -> client: a chunk of build log output */
  logChunk: "deployment:log",
  /** server -> client: deployment status changed */
  statusChange: "deployment:status",
} as const;

export interface LogChunkEvent {
  deploymentId: string;
  chunk: string;
  timestamp: string;
}

export interface StatusChangeEvent {
  deploymentId: string;
  appId: string;
  status: DeploymentStatus;
  url?: string | null;
  errorMessage?: string | null;
}
