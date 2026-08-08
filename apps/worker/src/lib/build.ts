import { access, chmod } from "node:fs/promises";
import path from "node:path";
import type { BuildTool } from "@spring-lane/shared";
import { runCommand, runCommandCapture } from "./process.js";

export interface CloneResult {
  commitSha: string;
  commitMessage: string;
}

export async function cloneRepository(options: {
  repoFullName: string;
  branch: string;
  token: string;
  destDir: string;
  onOutput?: (chunk: string) => void | Promise<void>;
}): Promise<CloneResult> {
  const { repoFullName, branch, token, destDir, onOutput } = options;
  const cloneUrl = `https://x-access-token:${token}@github.com/${repoFullName}.git`;

  await runCommand(
    "git",
    ["clone", "--depth", "1", "--branch", branch, cloneUrl, destDir],
    {
      cwd: process.cwd(),
      onOutput: (chunk) => {
        const sanitized = chunk.replaceAll(token, "***");
        return onOutput?.(sanitized);
      },
    },
  );

  const commitSha = await runCommandCapture("git", ["rev-parse", "HEAD"], {
    cwd: destDir,
  });
  const commitMessage = await runCommandCapture(
    "git",
    ["log", "-1", "--pretty=%s"],
    { cwd: destDir },
  );

  return { commitSha, commitMessage };
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function detectBuildTool(repoDir: string): Promise<BuildTool> {
  const isWin = process.platform === "win32";
  const gradleWrapper = path.join(repoDir, isWin ? "gradlew.bat" : "gradlew");
  const mavenWrapper = path.join(repoDir, isWin ? "mvnw.cmd" : "mvnw");

  if (await pathExists(gradleWrapper)) {
    return "gradle";
  }
  if (await pathExists(path.join(repoDir, "gradlew"))) {
    return "gradle";
  }
  if (await pathExists(mavenWrapper)) {
    return "maven";
  }
  if (await pathExists(path.join(repoDir, "mvnw"))) {
    return "maven";
  }
  if (await pathExists(path.join(repoDir, "build.gradle")) ||
      await pathExists(path.join(repoDir, "build.gradle.kts"))) {
    return "gradle";
  }
  if (await pathExists(path.join(repoDir, "pom.xml"))) {
    return "maven";
  }

  throw new Error(
    "No supported Spring Boot build tool found (expected Gradle or Maven wrapper)",
  );
}

export function buildCommand(
  tool: BuildTool,
  repoDir: string,
  imageName: string,
): { command: string; args: string[] } {
  const isWin = process.platform === "win32";

  if (tool === "gradle") {
    const wrapper = path.join(repoDir, isWin ? "gradlew.bat" : "gradlew");
    return {
      command: wrapper,
      args: ["bootBuildImage", `--imageName=${imageName}`],
    };
  }

  const wrapper = path.join(repoDir, isWin ? "mvnw.cmd" : "mvnw");
  return {
    command: wrapper,
    args: [
      "spring-boot:build-image",
      `-Dspring-boot.build-image.imageName=${imageName}`,
    ],
  };
}

async function ensureExecutable(command: string): Promise<void> {
  if (process.platform === "win32") return;
  await chmod(command, 0o755).catch(() => undefined);
}

export async function runBootBuildImage(options: {
  repoDir: string;
  tool: BuildTool;
  imageName: string;
  onOutput?: (chunk: string) => void | Promise<void>;
}): Promise<void> {
  const { command, args } = buildCommand(
    options.tool,
    options.repoDir,
    options.imageName,
  );

  await ensureExecutable(command);

  await runCommand(command, args, {
    cwd: options.repoDir,
    onOutput: options.onOutput,
  });
}

export function imageTag(appName: string, deploymentId: string): string {
  const shortId = deploymentId.slice(0, 12);
  return `spring-lane/${appName}:${shortId}`;
}
