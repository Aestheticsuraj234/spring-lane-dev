import { rm, mkdir } from "node:fs/promises";
import path from "node:path";
import type { Job } from "bullmq";
import { prisma } from "@spring-lane/db";
import type { BuildJobData } from "@spring-lane/shared";
import { config } from "../config.js";
import { BuildLogger } from "../lib/build-logger.js";
import {
  cloneRepository,
  detectBuildTool,
  imageTag,
  runBootBuildImage,
} from "../lib/build.js";
import { setDeploymentStatus } from "../lib/deployment-status.js";
import { GithubTokenError, getGithubAccessToken } from "../lib/github-token.js";
import { logPublisher } from "../lib/redis.js";
import { getContainerRuntime, getLiveDeployment, loadAppEnv } from "../lib/runtime.js";
import { LogStorage } from "@spring-lane/shared/log-storage";
import { CommandError } from "../lib/process.js";

export async function processBuildJob(job: Job<BuildJobData>): Promise<void> {
  const { deploymentId, appId } = job.data;
  const storage = new LogStorage(config.logDir);
  const publisher = logPublisher;
  const workspaceDir = path.join(config.buildWorkspace, deploymentId);
  let logger: BuildLogger | null = null;

  try {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { app: true },
    });

    if (!deployment || deployment.appId !== appId) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    if (deployment.status !== "QUEUED") {
      console.warn(
        `[worker] skipping deployment ${deploymentId} with status ${deployment.status}`,
      );
      return;
    }

    const app = deployment.app;
    const logPath = await storage.init(deploymentId);
    logger = new BuildLogger(storage, publisher, deploymentId);
    const writeOutput = logger.createWriter();

    await setDeploymentStatus(deploymentId, appId, "BUILDING", publisher, {
      logPath,
      errorMessage: null,
    });

    await logger.log(`Starting build for ${app.repoFullName}@${app.branch}`);

    const token = await getGithubAccessToken(app.ownerId);
    await mkdir(workspaceDir, { recursive: true });

    await logger.log("Cloning repository...");
    const cloneResult = await cloneRepository({
      repoFullName: app.repoFullName,
      branch: app.branch,
      token,
      destDir: workspaceDir,
      onOutput: writeOutput,
    });

    await logger.log(`Checked out ${cloneResult.commitSha.slice(0, 7)}: ${cloneResult.commitMessage}`);

    const tool = await detectBuildTool(workspaceDir);
    await logger.log(`Detected ${tool} build`);

    const tag = imageTag(app.name, deploymentId);
    await logger.log(
      `Building OCI image ${tag} with Cloud Native Buildpacks (${config.buildpackBuilder})...`,
    );

    await runBootBuildImage({
      repoDir: workspaceDir,
      imageName: tag,
      packImage: config.packImage,
      builder: config.buildpackBuilder,
      dockerSocket: config.dockerSocket || undefined,
      packVolumeKey: config.packVolumeKey,
      onOutput: writeOutput,
    });

    await logger.log("Build completed successfully");

    await setDeploymentStatus(deploymentId, appId, "DEPLOYING", publisher, {
      commitSha: cloneResult.commitSha,
      commitMessage: cloneResult.commitMessage,
      imageTag: tag,
      logPath,
    });

    await logger.log("Deploying container...");
    const runtime = getContainerRuntime();
    const env = await loadAppEnv(app.id);
    const previousLive = await getLiveDeployment(app.id);

    const deployed = await runtime.swapDeploy(
      {
        appName: app.name,
        deploymentId,
        imageTag: tag,
        port: app.port,
        memoryMb: app.memoryMb,
        cpus: app.cpus,
        env,
      },
      previousLive?.containerId,
    );

    await logger.log(`Container ${deployed.containerName} is live at ${deployed.url}`);

    if (previousLive) {
      await prisma.deployment.update({
        where: { id: previousLive.id },
        data: {
          status: "STOPPED",
          finishedAt: new Date(),
        },
      });
    }

    await setDeploymentStatus(deploymentId, appId, "LIVE", publisher, {
      commitSha: cloneResult.commitSha,
      commitMessage: cloneResult.commitMessage,
      imageTag: tag,
      logPath,
      containerId: deployed.containerId,
      url: deployed.url,
      finishedAt: new Date(),
    });
  } catch (error) {
    const message =
      error instanceof GithubTokenError || error instanceof CommandError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Build failed";

    console.error(`[worker] build failed for ${deploymentId}:`, error);

    if (logger) {
      await logger.log(`ERROR: ${message}`).catch(() => undefined);
    }

    try {
      await setDeploymentStatus(deploymentId, appId, "FAILED", publisher, {
        errorMessage: message,
        finishedAt: new Date(),
      });
    } catch (updateError) {
      console.error("[worker] failed to mark deployment as FAILED:", updateError);
    }

    throw error;
  } finally {
    await rm(workspaceDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
