import { Router } from "express";
import { prisma } from "@spring-lane/db";
import type { CreateAppRequest, UpdateEnvRequest } from "@spring-lane/shared";
import { config } from "../config.js";
import { LogStorage } from "@spring-lane/shared/log-storage";
import { encryptSecret } from "../lib/crypto.js";
import { parseRepoFullName } from "../lib/github.js";
import { enqueueBuildJob } from "../lib/queue.js";
import { getContainerRuntime, getLiveDeployment } from "../lib/runtime.js";
import { getOwnedDeployment } from "../lib/deployments.js";
import {
  APP_NAME_PATTERN,
  slugifyAppName,
  toAppDto,
  toDeploymentDto,
  toEnvVarDto,
} from "../lib/mappers.js";
import { requireAuth, type AuthedRequest } from "../middleware/require-auth.js";

export const appsRouter = Router();

appsRouter.use(requireAuth);

const appInclude = {
  deployments: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
};

appsRouter.get("/", async (req, res) => {
  const { session } = req as AuthedRequest;
  const apps = await prisma.app.findMany({
    where: { ownerId: session.user.id },
    include: appInclude,
    orderBy: { createdAt: "desc" },
  });

  res.json({ apps: apps.map(toAppDto) });
});

appsRouter.post("/", async (req, res) => {
  const { session } = req as AuthedRequest;
  const body = req.body as CreateAppRequest;

  const name = slugifyAppName(body.name ?? "");
  if (!APP_NAME_PATTERN.test(name)) {
    res.status(400).json({
      error: "App name must be 1-63 lowercase letters, numbers, or hyphens",
    });
    return;
  }

  const repoFullName = body.repoFullName?.trim();
  const branch = body.branch?.trim();
  if (!repoFullName || !branch) {
    res.status(400).json({ error: "repoFullName and branch are required" });
    return;
  }

  try {
    parseRepoFullName(repoFullName);
  } catch {
    res.status(400).json({ error: "repoFullName must be in owner/repo format" });
    return;
  }

  const existing = await prisma.app.findUnique({ where: { name } });
  if (existing) {
    res.status(409).json({ error: "An app with this name already exists" });
    return;
  }

  const port = body.port ?? 8080;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    res.status(400).json({ error: "port must be an integer between 1 and 65535" });
    return;
  }

  const envEntries = Object.entries(body.env ?? {}).filter(
    ([key]) => key.trim().length > 0,
  );

  try {
    const app = await prisma.$transaction(async (tx) => {
      const created = await tx.app.create({
        data: {
          name,
          repoFullName,
          branch,
          ownerId: session.user.id,
          port,
          memoryMb: config.defaultAppMemoryMb,
          cpus: config.defaultAppCpus,
        },
      });

      if (envEntries.length > 0) {
        await tx.envVar.createMany({
          data: envEntries.map(([key, value]) => ({
            appId: created.id,
            key,
            valueEncrypted: encryptSecret(value),
          })),
        });
      }

      return tx.app.findUniqueOrThrow({
        where: { id: created.id },
        include: appInclude,
      });
    });

    res.status(201).json({ app: toAppDto(app) });
  } catch (error) {
    console.error("[apps:create]", error);
    res.status(500).json({ error: "Failed to create app" });
  }
});

appsRouter.get("/:id", async (req, res) => {
  const app = await getOwnedApp(authed(req), req.params.id);
  if (!app) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  res.json({ app: toAppDto(app) });
});

appsRouter.delete("/:id", async (req, res) => {
  const app = await getOwnedApp(authed(req), req.params.id);
  if (!app) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  const live = await getLiveDeployment(app.id);
  if (live?.containerId) {
    try {
      await getContainerRuntime().stopAndRemove(live.containerId);
    } catch (error) {
      console.error("[apps:delete] failed to remove container:", error);
    }
  }

  await prisma.app.delete({ where: { id: app.id } });
  res.status(204).send();
});

appsRouter.get("/:id/env", async (req, res) => {
  const app = await getOwnedApp(authed(req), req.params.id);
  if (!app) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  const envVars = await prisma.envVar.findMany({
    where: { appId: app.id },
    orderBy: { key: "asc" },
  });

  res.json({ env: envVars.map((item) => toEnvVarDto(item.key)) });
});

appsRouter.patch("/:id/env", async (req, res) => {
  const app = await getOwnedApp(authed(req), req.params.id);
  if (!app) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  const body = req.body as UpdateEnvRequest;
  if (!body?.env || typeof body.env !== "object") {
    res.status(400).json({ error: "env object is required" });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(body.env)) {
        if (!key.trim()) continue;

        if (value === null) {
          await tx.envVar.deleteMany({
            where: { appId: app.id, key },
          });
          continue;
        }

        await tx.envVar.upsert({
          where: {
            appId_key: {
              appId: app.id,
              key,
            },
          },
          create: {
            appId: app.id,
            key,
            valueEncrypted: encryptSecret(value),
          },
          update: {
            valueEncrypted: encryptSecret(value),
          },
        });
      }
    });

    const envVars = await prisma.envVar.findMany({
      where: { appId: app.id },
      orderBy: { key: "asc" },
    });

    res.json({ env: envVars.map((item) => toEnvVarDto(item.key)) });
  } catch (error) {
    console.error("[apps:env]", error);
    res.status(500).json({ error: "Failed to update environment variables" });
  }
});

appsRouter.post("/:id/stop", async (req, res) => {
  const app = await getOwnedApp(authed(req), req.params.id);
  if (!app) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  const live = await getLiveDeployment(app.id);
  if (!live?.containerId) {
    res.status(409).json({ error: "No running deployment to stop" });
    return;
  }

  try {
    await getContainerRuntime().stop(live.containerId);
    const deployment = await prisma.deployment.update({
      where: { id: live.id },
      data: {
        status: "STOPPED",
        finishedAt: new Date(),
      },
    });
    res.json({ deployment: toDeploymentDto(deployment) });
  } catch (error) {
    console.error("[apps:stop]", error);
    res.status(500).json({ error: "Failed to stop container" });
  }
});

appsRouter.post("/:id/restart", async (req, res) => {
  const app = await getOwnedApp(authed(req), req.params.id);
  if (!app) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  const live = await getLiveDeployment(app.id);
  if (!live?.containerId) {
    res.status(409).json({ error: "No running deployment to restart" });
    return;
  }

  try {
    await getContainerRuntime().restart(live.containerId);
    res.json({ deployment: toDeploymentDto(live) });
  } catch (error) {
    console.error("[apps:restart]", error);
    res.status(500).json({ error: "Failed to restart container" });
  }
});

appsRouter.get("/:id/logs", async (req, res) => {
  const app = await getOwnedApp(authed(req), req.params.id);
  if (!app) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  const live = await getLiveDeployment(app.id);
  if (!live?.containerId) {
    res.status(409).json({ error: "No running container for this app" });
    return;
  }

  const tail = parseLogTail(req.query.tail);

  try {
    const logs = await getContainerRuntime().getLogs(live.containerId, { tail });
    res.json({ logs });
  } catch (error) {
    console.error("[apps:logs]", error);
    res.status(500).json({ error: "Failed to fetch container logs" });
  }
});

appsRouter.get("/:id/deployments", async (req, res) => {
  const app = await getOwnedApp(authed(req), req.params.id);
  if (!app) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  const deployments = await prisma.deployment.findMany({
    where: { appId: app.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  res.json({ deployments: deployments.map(toDeploymentDto) });
});

appsRouter.get("/:id/deployments/:deploymentId/logs", async (req, res) => {
  const { session } = authed(req);
  const appId = req.params.id;
  const deploymentId = req.params.deploymentId;

  if (!appId || !deploymentId) {
    res.status(400).json({ error: "App id and deployment id are required" });
    return;
  }

  const deployment = await getOwnedDeployment(
    session.user.id,
    appId,
    deploymentId,
  );

  if (!deployment) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }

  const logs = await new LogStorage(config.logDir).read(deploymentId);
  if (logs === null) {
    res.status(404).json({ error: "Build logs not found" });
    return;
  }

  res.json({ logs });
});

appsRouter.post("/:id/deploy", async (req, res) => {
  const app = await getOwnedApp(authed(req), req.params.id);
  if (!app) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  const active = await prisma.deployment.findFirst({
    where: {
      appId: app.id,
      status: { in: ["QUEUED", "BUILDING", "DEPLOYING"] },
    },
  });

  if (active) {
    res.status(409).json({
      error: "A deployment is already in progress",
      deployment: toDeploymentDto(active),
    });
    return;
  }

  try {
    const deployment = await prisma.deployment.create({
      data: {
        appId: app.id,
        status: "QUEUED",
        startedAt: new Date(),
      },
    });

    await enqueueBuildJob({
      deploymentId: deployment.id,
      appId: app.id,
    });

    res.status(202).json({ deployment: toDeploymentDto(deployment) });
  } catch (error) {
    console.error("[apps:deploy]", error);
    res.status(500).json({ error: "Failed to enqueue deployment" });
  }
});

async function getOwnedApp(req: AuthedRequest, id: string | undefined) {
  if (!id) return null;

  return prisma.app.findFirst({
    where: {
      id,
      ownerId: req.session.user.id,
    },
    include: appInclude,
  });
}

function authed(req: import("express").Request): AuthedRequest {
  return req as unknown as AuthedRequest;
}

function parseLogTail(value: unknown): number {
  const parsed = typeof value === "string" ? Number(value) : 200;
  if (!Number.isFinite(parsed) || parsed < 1) return 200;
  return Math.min(Math.floor(parsed), 2000);
}
