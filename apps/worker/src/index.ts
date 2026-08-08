import "dotenv/config";
import { Worker } from "bullmq";
import { prisma } from "@spring-lane/db";
import { BUILD_QUEUE_NAME, type BuildJobData } from "@spring-lane/shared";
import { config } from "./config.js";
import { processBuildJob } from "./jobs/build-job.js";
import { logPublisher, redis } from "./lib/redis.js";

await prisma.$queryRaw`SELECT 1`;
console.log("[worker] database connected");

const worker = new Worker<BuildJobData>(
  BUILD_QUEUE_NAME,
  async (job) => processBuildJob(job),
  {
    connection: redis,
    concurrency: config.buildConcurrency,
  },
);

worker.on("ready", () => {
  console.log(
    `[worker] listening on queue "${BUILD_QUEUE_NAME}" (concurrency: ${config.buildConcurrency})`,
  );
});

worker.on("completed", (job) => {
  console.log(`[worker] job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`[worker] job ${job?.id ?? "unknown"} failed:`, error.message);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[worker] ${signal} received, shutting down`);
  await worker.close();
  await logPublisher.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
