import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL env var is required for Prisma");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

// Module-scoped singleton so production doesn't leak connections
let _client: PrismaClient | undefined;

function getPrisma(): PrismaClient {
  if (_client) return _client;
  if (global.prisma) {
    _client = global.prisma;
    return _client;
  }
  const client = createPrismaClient();
  _client = client;
  // In dev, also store on global so HMR doesn't create extra clients
  if (process.env.NODE_ENV !== "production") {
    global.prisma = client;
  }
  return client;
}

// Lazy init: create client on first use so build (no DATABASE_URL) doesn't throw
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getPrisma() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

