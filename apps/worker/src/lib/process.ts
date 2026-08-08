import { spawn } from "node:child_process";

export class CommandError extends Error {
  constructor(
    message: string,
    readonly exitCode: number | null,
  ) {
    super(message);
    this.name = "CommandError";
  }
}

export async function runCommand(
  command: string,
  args: string[],
  options: {
    cwd: string;
    env?: Record<string, string>;
    onOutput?: (chunk: string) => void | Promise<void>;
  },
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });

    const handleChunk = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      void options.onOutput?.(text);
    };

    child.stdout?.on("data", handleChunk);
    child.stderr?.on("data", handleChunk);

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new CommandError(`${command} exited with code ${code ?? "unknown"}`, code));
    });
  });
}

export async function runCommandCapture(
  command: string,
  args: string[],
  options: { cwd: string },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", () => {
      // Ignore stderr for capture helpers.
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      reject(new CommandError(`${command} exited with code ${code ?? "unknown"}`, code));
    });
  });
}
