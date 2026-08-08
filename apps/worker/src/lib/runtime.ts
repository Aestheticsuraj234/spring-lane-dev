import { prisma } from "@spring-lane/db";
import { ContainerRuntime } from "@spring-lane/runtime";
import { config } from "../config.js";
import { decryptSecret } from "./crypto.js";

let runtime: ContainerRuntime | null = null;

export function getContainerRuntime(): ContainerRuntime {
  runtime ??= new ContainerRuntime({
    traefikNetwork: config.traefikNetwork,
    baseDomain: config.baseDomain,
    socketPath: config.dockerSocket || undefined,
  });
  return runtime;
}

export async function loadAppEnv(appId: string): Promise<Record<string, string>> {
  const envVars = await prisma.envVar.findMany({
    where: { appId },
    orderBy: { key: "asc" },
  });

  const env: Record<string, string> = {};
  for (const item of envVars) {
    env[item.key] = decryptSecret(item.valueEncrypted);
  }
  return env;
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
