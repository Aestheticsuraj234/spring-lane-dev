import path from "node:path";

export function normalizeProjectPath(input?: string | null): string {
  if (!input || input.trim() === "" || input.trim() === ".") {
    return "";
  }

  const trimmed = input.trim();

  if (/^[a-zA-Z]:[\\/]/.test(trimmed)) {
    throw new Error("projectPath must be a relative path inside the repo");
  }

  const normalized = trimmed.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");

  if (!normalized) {
    return "";
  }

  if (normalized.includes("..")) {
    throw new Error("projectPath must not contain ..");
  }

  if (path.posix.isAbsolute(normalized)) {
    throw new Error("projectPath must be a relative path inside the repo");
  }

  return normalized;
}

export function resolveProjectDir(repoDir: string, projectPath: string): string {
  const repoRoot = path.resolve(repoDir);
  const resolved = path.resolve(repoRoot, projectPath || ".");

  if (
    resolved !== repoRoot &&
    !resolved.startsWith(`${repoRoot}${path.sep}`)
  ) {
    throw new Error("projectPath escapes repository root");
  }

  return resolved;
}

export function packProjectPath(projectPath: string): string {
  const normalized = normalizeProjectPath(projectPath);
  return normalized ? `/workspace/${normalized.replace(/\\/g, "/")}` : "/workspace";
}
