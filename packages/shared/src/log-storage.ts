import { mkdir, appendFile, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

export class LogStorage {
  constructor(private readonly rootDir: string) {}

  relativePath(deploymentId: string): string {
    return path.join("deployments", `${deploymentId}.log`);
  }

  absolutePath(deploymentId: string): string {
    return path.join(this.rootDir, this.relativePath(deploymentId));
  }

  async init(deploymentId: string): Promise<string> {
    const filePath = this.absolutePath(deploymentId);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, "", "utf8");
    return this.relativePath(deploymentId);
  }

  async append(deploymentId: string, chunk: string): Promise<void> {
    await appendFile(this.absolutePath(deploymentId), chunk, "utf8");
  }

  async read(deploymentId: string): Promise<string | null> {
    try {
      return await readFile(this.absolutePath(deploymentId), "utf8");
    } catch (error) {
      if (isEnoent(error)) return null;
      throw error;
    }
  }
}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "ENOENT"
  );
}
