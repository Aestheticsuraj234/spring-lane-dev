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
    org: optional("GITHUB_ORG", ""),
  },
  encryptionKey: optional("ENCRYPTION_KEY", ""),
  sessionSecret: optional("SESSION_SECRET", "dev-only-secret"),
  logDir: optional("LOG_DIR", "./data/logs"),
} as const;
