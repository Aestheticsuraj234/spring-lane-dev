import { prisma } from "@spring-lane/db";

export async function canAccessDeployment(
  userId: string,
  deploymentId: string,
): Promise<boolean> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    select: {
      app: {
        select: { ownerId: true },
      },
    },
  });

  return deployment?.app.ownerId === userId;
}

export async function getOwnedDeployment(
  userId: string,
  appId: string,
  deploymentId: string,
) {
  return prisma.deployment.findFirst({
    where: {
      id: deploymentId,
      appId,
      app: { ownerId: userId },
    },
  });
}
