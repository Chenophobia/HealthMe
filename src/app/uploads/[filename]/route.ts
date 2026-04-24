import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import mime from "mime-types";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (filename.includes("/") || filename.includes("..")) return NextResponse.json({ error: "bad" }, { status: 400 });
  const filepath = path.join(process.cwd(), "data", "uploads", filename);
  try {
    const buf = await fs.readFile(filepath);
    const type = mime.lookup(filename) || "application/octet-stream";
    return new NextResponse(buf as unknown as BodyInit, { headers: { "Content-Type": type } });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
