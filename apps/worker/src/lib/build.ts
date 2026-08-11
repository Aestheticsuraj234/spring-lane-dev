import { access } from "node:fs/promises";
import path from "node:path";
import type { BuildTool } from "@spring-lane/shared";
import { resolveProjectDir } from "@spring-lane/shared";
import { runCommand, runCommandCapture } from "./process.js";
import { runBuildpackBuild } from "./pack-build.js";

export { resolveProjectDir };

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

export async function detectBuildTool(
  repoDir: string,
  projectPath = "",
): Promise<BuildTool> {
  const projectDir = resolveProjectDir(repoDir, projectPath);
  const pathLabel = projectPath || "repo root";
  const isWin = process.platform === "win32";
  const gradleWrapper = path.join(projectDir, isWin ? "gradlew.bat" : "gradlew");
  const mavenWrapper = path.join(projectDir, isWin ? "mvnw.cmd" : "mvnw");
  const hasGradle =
    (await pathExists(gradleWrapper)) ||
    (await pathExists(path.join(projectDir, "gradlew"))) ||
    (await pathExists(path.join(projectDir, "build.gradle"))) ||
    (await pathExists(path.join(projectDir, "build.gradle.kts")));
  const hasMaven =
    (await pathExists(mavenWrapper)) ||
    (await pathExists(path.join(projectDir, "mvnw"))) ||
    (await pathExists(path.join(projectDir, "pom.xml")));

  if (hasGradle) {
    return "gradle";
  }
  if (hasMaven) {
    return "maven";
  }

  const looksLikeNode =
    (await pathExists(path.join(projectDir, "package.json"))) &&
    !(await pathExists(path.join(projectDir, "pom.xml")));

  if (looksLikeNode) {
    throw new Error(
      `This repository looks like a Node.js project at ${pathLabel} (package.json found). Spring Lane deploys Spring Boot apps — pick a repo with pom.xml or build.gradle.`,
    );
  }

  throw new Error(
    `No Spring Boot project found at ${pathLabel} (expected pom.xml, build.gradle, or Maven/Gradle wrapper).`,
  );
}

export async function runBootBuildImage(options: {
  repoDir: string;
  projectPath?: string;
  imageName: string;
  packImage: string;
  builder: string;
  dockerSocket?: string;
  packVolumeKey?: string;
  onOutput?: (chunk: string) => void | Promise<void>;
}): Promise<void> {
  await runBuildpackBuild({
    repoDir: path.resolve(options.repoDir),
    projectPath: options.projectPath ?? "",
    imageName: options.imageName,
    packImage: options.packImage,
    builder: options.builder,
    dockerSocket: options.dockerSocket,
    packVolumeKey: options.packVolumeKey,
    onOutput: options.onOutput,
  });
}

export function imageTag(appName: string, deploymentId: string): string {
  const shortId = deploymentId.slice(0, 12);
  return `spring-lane/${appName}:${shortId}`;
}
