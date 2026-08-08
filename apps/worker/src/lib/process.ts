import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";

export class CommandError extends Error {
  constructor(
    message: string,
    readonly exitCode: number | null,
  ) {
    super(message);
    this.name = "CommandError";
  }
}

function spawnProcess(
  command: string,
  args: string[],
  options: {
    cwd: string;
    env?: Record<string, string>;
  },
): ChildProcessWithoutNullStreams {
  const cwd = path.resolve(options.cwd);
  const env = { ...process.env, ...options.env };
  const isWin = process.platform === "win32";
  const isBatch = isWin && /\.(cmd|bat)$/i.test(command);

  if (isBatch) {
    return spawn("cmd.exe", ["/d", "/s", "/c", command, ...args], {
      cwd,
      env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
  }

  return spawn(command, args, {
    cwd,
    env,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

function formatCommandError(command: string, cwd: string, code: number | null): string {
  const relativeCwd = path.relative(process.cwd(), path.resolve(cwd)) || ".";
  return `${path.join(relativeCwd, command)} exited with code ${code ?? "unknown"}`;
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
    const child = spawnProcess(command, args, options);

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
      reject(
        new CommandError(formatCommandError(command, options.cwd, code), code),
      );
    });
  });
}

export async function runCommandCapture(
  command: string,
  args: string[],
  options: { cwd: string },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(command, args, options);

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
      reject(
        new CommandError(formatCommandError(command, options.cwd, code), code),
      );
    });
  });
}
