import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { BUILD_QUEUE_NAME, type BuildJobData } from "@spring-lane/shared";
import { config } from "../config.js";

const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

export const buildQueue = new Queue<BuildJobData>(BUILD_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 1,
  },
});

export async function enqueueBuildJob(data: BuildJobData): Promise<string> {
  const job = await buildQueue.add("build", data, {
    jobId: data.deploymentId,
  });
  return job.id ?? data.deploymentId;
}
