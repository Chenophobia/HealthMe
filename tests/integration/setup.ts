import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

export async function createTestDb(): Promise<{ prisma: PrismaClient; cleanup: () => void; dbUrl: string }> {
  const dir = fs.mkdtempSync(path.join(process.cwd(), "test-db-"));
  const dbFile = path.join(dir, "test.db");
  const dbUrl = `file:${dbFile}`;
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "ignore",
  });
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  return {
    prisma,
    dbUrl,
    cleanup: () => {
      prisma.$disconnect();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
