import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { callOllamaVision } from "@/lib/ocr-client";
import { parseOcrResponse } from "@/lib/ocr-schema";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "not_image" }, { status: 400 });

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const id = crypto.randomUUID();
  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${id}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buf);

  const baseUrl = process.env.OLLAMA_URL ?? "http://ollama:11434";
  const model = process.env.OLLAMA_MODEL ?? "qwen2-vl:7b";

  let last: Awaited<ReturnType<typeof callOllamaVision>> | null = null;
  for (let i = 0; i < 2; i++) {
    last = await callOllamaVision({ baseUrl, model, imageBase64: buf.toString("base64") });
    if (last.ok) break;
  }

  if (!last || !last.ok) {
    return NextResponse.json(
      {
        error: "ocr_failed",
        detail: last?.error ?? "unknown",
        photoPath: `/uploads/${filename}`,
        preview: {},
      },
      { status: 503 }
    );
  }

  const parsed = parseOcrResponse(last.raw);
  if (!parsed.ok) {
    return NextResponse.json({
      error: "parse_failed",
      detail: parsed.error,
      photoPath: `/uploads/${filename}`,
      rawOcrJson: last.raw,
      preview: {},
    }, { status: 200 });
  }

  return NextResponse.json({
    preview: parsed.value,
    photoPath: `/uploads/${filename}`,
    rawOcrJson: last.raw,
  });
}
