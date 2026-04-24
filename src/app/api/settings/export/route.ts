import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  const dbPath = path.join(process.cwd(), "data", "db", "healthme.db");
  const buf = await fs.readFile(dbPath);
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename=healthme-${new Date().toISOString().slice(0, 10)}.db`,
    },
  });
}
