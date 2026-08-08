import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  nodeEnv: optional("NODE_ENV", "development"),
  databaseUrl: required("DATABASE_URL"),
  redisUrl: optional("REDIS_URL", "redis://localhost:6379"),
  logDir: optional("LOG_DIR", "./data/logs"),
  buildWorkspace: optional("BUILD_WORKSPACE", "./data/builds"),
  buildConcurrency: Number(optional("BUILD_CONCURRENCY", "2")),
  baseDomain: optional("BASE_DOMAIN", "localhost"),
  traefikNetwork: optional("TRAEFIK_NETWORK", "spring-lane"),
  dockerSocket: optional("DOCKER_SOCKET", ""),
  encryptionKey: optional("ENCRYPTION_KEY", ""),
} as const;
