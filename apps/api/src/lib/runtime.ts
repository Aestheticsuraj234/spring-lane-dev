import { prisma } from "@spring-lane/db";
import { ContainerRuntime } from "@spring-lane/runtime";
import { config } from "../config.js";

let runtime: ContainerRuntime | null = null;

export function getContainerRuntime(): ContainerRuntime {
  runtime ??= new ContainerRuntime({
    traefikNetwork: config.traefikNetwork,
    baseDomain: config.baseDomain,
    socketPath: config.dockerSocket || undefined,
  });
  return runtime;
}

export async function getLiveDeployment(appId: string) {
  return prisma.deployment.findFirst({
    where: {
      appId,
      status: "LIVE",
    },
    orderBy: { createdAt: "desc" },
  });
}
