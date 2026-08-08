import "dotenv/config";
import { BUILD_QUEUE_NAME } from "@spring-lane/shared";
import { prisma } from "@spring-lane/db";

// Placeholder entry point. The BullMQ worker that consumes the build queue
// is implemented in the build-pipeline milestone.
console.log(`[worker] starting (queue: ${BUILD_QUEUE_NAME})`);

await prisma.$queryRaw`SELECT 1`;
console.log("[worker] database connected");
