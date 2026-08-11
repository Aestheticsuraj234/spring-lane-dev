/** Java 21 + Paketo needs ~576MB of fixed JVM regions before heap. */
export const MIN_JAVA_CONTAINER_MEMORY_MB = 768;

export function effectiveContainerMemoryMb(memoryMb: number): number {
  return Math.max(memoryMb, MIN_JAVA_CONTAINER_MEMORY_MB);
}

/**
 * Paketo BellSoft Liberica memory calculator defaults assume ~576MB of fixed
 * regions for Java 21 (240M code cache + 250 thread stacks). That exceeds a
 * 512MB container limit before heap is allocated.
 */
export function buildPaketoJvmEnv(memoryMb: number): Record<string, string> {
  const env: Record<string, string> = {};

  if (memoryMb <= 768) {
    env.BPL_JVM_THREAD_COUNT = "50";
  }

  if (memoryMb <= 512) {
    env.BPL_JVM_HEAD_ROOM = "0";
  }

  return env;
}

export function mergeContainerEnv(
  platformEnv: Record<string, string>,
  userEnv: Record<string, string> = {},
): Record<string, string> {
  return { ...platformEnv, ...userEnv };
}
