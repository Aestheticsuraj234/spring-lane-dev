import { Redis } from "ioredis";
import {
  logChannel,
  statusChannel,
  type LogChunkEvent,
  type StatusChangeEvent,
} from "@spring-lane/shared";
import { config } from "../config.js";

export class LogPublisher {
  private readonly redis: Redis;

  constructor(redis?: Redis) {
    this.redis = redis ?? new Redis(config.redisUrl);
  }

  async publishChunk(deploymentId: string, chunk: string): Promise<void> {
    const event: LogChunkEvent = {
      deploymentId,
      chunk,
      timestamp: new Date().toISOString(),
    };
    await this.redis.publish(logChannel(deploymentId), JSON.stringify(event));
  }

  async publishStatus(event: StatusChangeEvent): Promise<void> {
    await this.redis.publish(statusChannel(), JSON.stringify(event));
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
