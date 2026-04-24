import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("db");
  if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });
  const dbPath = path.join(process.cwd(), "data", "db", "healthme.db");
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(dbPath, buf);
  return NextResponse.json({ ok: true });
}
