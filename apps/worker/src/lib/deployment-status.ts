import { prisma } from "@spring-lane/db";
import type { DeploymentStatus } from "@spring-lane/shared";
import type { LogPublisher } from "./log-publisher.js";

export async function setDeploymentStatus(
  deploymentId: string,
  appId: string,
  status: DeploymentStatus,
  publisher: LogPublisher,
  extra: {
    commitSha?: string;
    commitMessage?: string;
    imageTag?: string;
    logPath?: string;
    containerId?: string;
    url?: string;
    errorMessage?: string | null;
    finishedAt?: Date | null;
  } = {},
): Promise<void> {
  await prisma.deployment.update({
    where: { id: deploymentId },
    data: {
      status,
      ...extra,
    },
  });

  await publisher.publishStatus({
    deploymentId,
    appId,
    status,
    url: extra.url,
    errorMessage: extra.errorMessage ?? undefined,
  });
}
