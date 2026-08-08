#!/usr/bin/env tsx
/**
 * Quick health check for local dev stack (Postgres, Redis, API).
 * Usage: pnpm smoke:health
 */
import "dotenv/config";

const API_URL = process.env.API_URL ?? "http://localhost:3000";
const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`[ok] ${name}`);
    return true;
  } catch (error) {
    console.error(`[fail] ${name}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

async function main() {
  let passed = 0;
  let total = 0;

  const run = async (name: string, fn: () => Promise<void>) => {
    total += 1;
    if (await check(name, fn)) passed += 1;
  };

  if (DATABASE_URL) {
    await run("postgres", async () => {
      const { default: pg } = await import("pg");
      const client = new pg.Client({ connectionString: DATABASE_URL });
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
    });
  }

  await run("redis", async () => {
    const { Redis } = await import("ioredis");
    const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 3000 });
    const pong = await redis.ping();
    await redis.quit();
    if (pong !== "PONG") throw new Error(`unexpected ping response: ${pong}`);
  });

  await run("api /health", async () => {
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { ok?: boolean; db?: boolean };
    if (!body.ok || !body.db) throw new Error(JSON.stringify(body));
  });

  console.log(`\n${passed}/${total} checks passed`);
  process.exit(passed === total ? 0 : 1);
}

void main();
