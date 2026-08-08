import path from "node:path";
import { runCommand } from "./process.js";

export interface PackBuildOptions {
  repoDir: string;
  imageName: string;
  packImage: string;
  builder: string;
  dockerSocket?: string;
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

export function buildPackDockerArgs(options: {
  repoDir: string;
  imageName: string;
  packImage: string;
  builder: string;
  dockerSocket?: string;
}): { command: string; args: string[] } {
  return {
    command: "docker",
    args: [
      "run",
      "--rm",
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

export async function runBuildpackBuild(
  options: PackBuildOptions,
): Promise<void> {
  const { command, args } = buildPackDockerArgs(options);

  await runCommand(command, args, {
    cwd: process.cwd(),
    onOutput: options.onOutput,
  });
}
