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
  port: Number(optional("API_PORT", "3000")),
  baseDomain: optional("BASE_DOMAIN", "localhost"),
  webUrl: optional("WEB_URL", "http://localhost:5173"),
  apiUrl: optional("API_URL", "http://localhost:3000"),
  databaseUrl: required("DATABASE_URL"),
  redisUrl: optional("REDIS_URL", "redis://localhost:6379"),
  github: {
    clientId: optional("GITHUB_CLIENT_ID", ""),
    clientSecret: optional("GITHUB_CLIENT_SECRET", ""),
  },
  encryptionKey: optional("ENCRYPTION_KEY", ""),
  authSecret: optional("BETTER_AUTH_SECRET", optional("SESSION_SECRET", "dev-only-secret")),
  /** Public URL for OAuth callbacks — use WEB_URL in dev (Vite proxy), API URL in prod */
  betterAuthUrl: optional("BETTER_AUTH_URL", optional("WEB_URL", "http://localhost:5173")),
  logDir: optional("LOG_DIR", "./data/logs"),
  defaultAppMemoryMb: Number(optional("DEFAULT_APP_MEMORY_MB", "512")),
  defaultAppCpus: Number(optional("DEFAULT_APP_CPUS", "1")),
  buildConcurrency: Number(optional("BUILD_CONCURRENCY", "2")),
  traefikNetwork: optional("TRAEFIK_NETWORK", "spring-lane"),
  dockerSocket: optional("DOCKER_SOCKET", ""),
} as const;
