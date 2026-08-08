import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

export function createPrismaClient(connectionString: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function getPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient(connectionString);
  }

  return globalForPrisma.prisma;
}

/** Process-scoped Prisma client (singleton in dev to survive hot reload). */
export const prisma = getPrisma();

export async function disconnectPrisma(): Promise<void> {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect();
    globalForPrisma.prisma = undefined;
  }
}
