import Docker from "dockerode";
import type { Container } from "dockerode";
import {
  appPublicUrl,
  buildTraefikLabels,
  type TraefikLabelOptions,
} from "./traefik-labels.js";

export interface ContainerRuntimeOptions {
  /** Docker socket path or host connection string */
  socketPath?: string;
  traefikNetwork: string;
  baseDomain: string;
}

export interface DeployOptions {
  appName: string;
  deploymentId: string;
  imageTag: string;
  port: number;
  memoryMb: number;
  cpus: number;
  env?: Record<string, string>;
}

export interface DeployResult {
  containerId: string;
  containerName: string;
  url: string;
}

export class ContainerRuntime {
  private readonly docker: Docker;

  constructor(private readonly options: ContainerRuntimeOptions) {
    this.docker = new Docker(
      options.socketPath ? { socketPath: options.socketPath } : {},
    );
  }

  containerName(appName: string, deploymentId: string): string {
    return `spring-lane-${appName}-${deploymentId.slice(0, 8)}`;
  }

  async deploy(params: DeployOptions): Promise<DeployResult> {
    const containerName = this.containerName(params.appName, params.deploymentId);
    const url = appPublicUrl(params.appName, this.options.baseDomain);
    const labels = buildTraefikLabels({
      appName: params.appName,
      deploymentId: params.deploymentId,
      port: params.port,
      baseDomain: this.options.baseDomain,
    } satisfies TraefikLabelOptions);

    const env = Object.entries(params.env ?? {}).map(
      ([key, value]) => `${key}=${value}`,
    );

    const container = await this.docker.createContainer({
      name: containerName,
      Image: params.imageTag,
      Env: env,
      Labels: labels,
      ExposedPorts: {
        [`${params.port}/tcp`]: {},
      },
      HostConfig: {
        NetworkMode: this.options.traefikNetwork,
        Memory: params.memoryMb * 1024 * 1024,
        NanoCpus: params.cpus * 1_000_000_000,
        RestartPolicy: {
          Name: "unless-stopped",
        },
      },
    });

    await container.start();
    await this.waitForRunning(container);

    const inspect = await container.inspect();
    return {
      containerId: inspect.Id,
      containerName,
      url,
    };
  }

  async swapDeploy(
    params: DeployOptions,
    previousContainerId?: string | null,
  ): Promise<DeployResult> {
    const result = await this.deploy(params);

    if (previousContainerId) {
      await this.stopAndRemove(previousContainerId).catch((error) => {
        console.warn(
          `[runtime] failed to remove previous container ${previousContainerId}:`,
          error,
        );
      });
    }

    return result;
  }

  async stop(containerId: string): Promise<void> {
    const container = this.getContainer(containerId);
    await this.stopContainer(container);
  }

  async restart(containerId: string): Promise<void> {
    const container = this.getContainer(containerId);
    await container.restart({ t: 10 });
    await this.waitForRunning(container);
  }

  async stopAndRemove(containerId: string): Promise<void> {
    const container = this.getContainer(containerId);
    await this.stopContainer(container);
    await container.remove({ force: true });
  }

  async getLogs(
    containerId: string,
    options: { tail?: number } = {},
  ): Promise<string> {
    const container = this.getContainer(containerId);
    const buffer = (await container.logs({
      stdout: true,
      stderr: true,
      tail: options.tail ?? 200,
      timestamps: true,
    })) as Buffer;

    return stripDockerLogHeaders(buffer.toString("utf8"));
  }

  private getContainer(containerId: string): Container {
    return this.docker.getContainer(containerId);
  }

  private async stopContainer(container: Container): Promise<void> {
    try {
      const inspect = await container.inspect();
      if (inspect.State.Running) {
        await container.stop({ t: 10 });
      }
    } catch (error) {
      if (isNotFound(error)) return;
      throw error;
    }
  }

  private async waitForRunning(
    container: Container,
    timeoutMs = 120_000,
  ): Promise<void> {
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
      const inspect = await container.inspect();
      if (inspect.State.Running) {
        return;
      }
      if (inspect.State.Status === "exited" || inspect.State.Status === "dead") {
        throw new Error(
          `Container exited during startup (${inspect.State.ExitCode ?? "unknown"})`,
        );
      }
      await sleep(500);
    }

    throw new Error("Timed out waiting for container to start");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (error as { statusCode: number }).statusCode === 404
  );
}

/** Docker multiplexes stdout/stderr with an 8-byte header per frame. */
function stripDockerLogHeaders(raw: string): string {
  if (!raw.includes("\u0000") && !raw.includes("\u0001")) {
    return raw;
  }

  const buffer = Buffer.from(raw, "utf8");
  let offset = 0;
  let output = "";

  while (offset + 8 <= buffer.length) {
    const size =
      buffer.readUInt32BE(offset + 4) ?? buffer.length - offset - 8;
    offset += 8;
    const end = Math.min(offset + size, buffer.length);
    output += buffer.subarray(offset, end).toString("utf8");
    offset = end;
  }

  return output || raw;
}
