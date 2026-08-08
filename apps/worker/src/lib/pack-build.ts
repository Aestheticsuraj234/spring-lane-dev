import path from "node:path";
import { runCommand, runCommandCapture } from "./process.js";

export interface PackBuildOptions {
  repoDir: string;
  imageName: string;
  packImage: string;
  builder: string;
  dockerSocket?: string;
  packVolumeKey?: string;
  onOutput?: (chunk: string) => void | Promise<void>;
}

export function dockerSocketMountArgs(dockerSocket?: string): string[] {
  const hostSocket =
    dockerSocket ||
    (process.platform === "win32"
      ? "//var/run/docker.sock"
      : "/var/run/docker.sock");

  return ["-v", `${hostSocket}:/var/run/docker.sock`];
}

export function dockerSourceMountArgs(repoDir: string): string[] {
  return ["-v", `${path.resolve(repoDir)}:/workspace`];
}

export function normalizeBuilderImage(builder: string): string {
  return builder.includes(":") ? builder : `${builder}:latest`;
}

export function packContainerEnvArgs(packVolumeKey: string): string[] {
  return [
    "-e",
    "DOCKER_HOST=unix:///var/run/docker.sock",
    "-e",
    `PACK_VOLUME_KEY=${packVolumeKey}`,
  ];
}

export function buildPackDockerArgs(options: {
  repoDir: string;
  imageName: string;
  packImage: string;
  builder: string;
  dockerSocket?: string;
  packVolumeKey?: string;
}): { command: string; args: string[] } {
  const packVolumeKey = options.packVolumeKey ?? "spring-lane-build-cache";

  return {
    command: "docker",
    args: [
      "run",
      "--rm",
      ...packContainerEnvArgs(packVolumeKey),
      ...dockerSourceMountArgs(options.repoDir),
      ...dockerSocketMountArgs(options.dockerSocket),
      options.packImage,
      "build",
      options.imageName,
      "--path",
      "/workspace",
      "--builder",
      options.builder,
      "--trust-builder",
      "--pull-policy",
      "if-not-present",
    ],
  };
}

export async function ensureDockerImage(
  image: string,
  onOutput?: (chunk: string) => void | Promise<void>,
): Promise<void> {
  try {
    await runCommandCapture("docker", ["image", "inspect", image], {
      cwd: process.cwd(),
    });
    return;
  } catch {
    await runCommand("docker", ["pull", image], {
      cwd: process.cwd(),
      onOutput,
    });
  }
}

export async function prepareBuildpackImages(
  options: {
    packImage: string;
    builder: string;
    onOutput?: (chunk: string) => void | Promise<void>;
  },
): Promise<void> {
  const builderImage = normalizeBuilderImage(options.builder);
  await ensureDockerImage(options.packImage, options.onOutput);
  await ensureDockerImage(builderImage, options.onOutput);
}

export async function runBuildpackBuild(
  options: PackBuildOptions,
): Promise<void> {
  await prepareBuildpackImages({
    packImage: options.packImage,
    builder: options.builder,
    onOutput: options.onOutput,
  });

  const { command, args } = buildPackDockerArgs(options);

  await runCommand(command, args, {
    cwd: process.cwd(),
    onOutput: options.onOutput,
  });
}
