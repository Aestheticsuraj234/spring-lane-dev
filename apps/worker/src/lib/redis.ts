import { Redis } from "ioredis";
import { config } from "../config.js";
import { LogPublisher } from "./log-publisher.js";

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

export const logPublisher = new LogPublisher(redis);
