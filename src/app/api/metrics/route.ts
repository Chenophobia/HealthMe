import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const RangeToDays: Record<string, number | null> = {
  "7d": 7, "30d": 30, "90d": 90, "365d": 365, "all": null,
};

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = RangeToDays[range];
  const where = days == null ? {} : { capturedAt: { gte: new Date(Date.now() - days * 86400_000) } };
  const rows = await prisma.bodyMetric.findMany({ where, orderBy: { capturedAt: "asc" } });
  return NextResponse.json(rows);
}

const PostSchema = z.object({
  capturedAt: z.string().datetime().optional(),
  source: z.enum(["PHOTO", "MANUAL"]),
  photoPath: z.string().optional(),
  rawOcrJson: z.string().optional(),
  weightKg: z.number().optional(),
  bmi: z.number().optional(),
  bodyFatPct: z.number().optional(),
  bodyFatKg: z.number().optional(),
  skeletalMuscleKg: z.number().optional(),
  skeletalMusclePct: z.number().optional(),
  subcutaneousFatPct: z.number().optional(),
  bmrKcal: z.number().int().optional(),
  metabolicAge: z.number().int().optional(),
  fatFreeMassKg: z.number().optional(),
  visceralFat: z.number().optional(),
  bodyWaterKg: z.number().optional(),
  bodyWaterPct: z.number().optional(),
  muscleMassKg: z.number().optional(),
  muscleMassPct: z.number().optional(),
  boneMassKg: z.number().optional(),
  boneMassPct: z.number().optional(),
  proteinKg: z.number().optional(),
  proteinPct: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { capturedAt, ...rest } = parsed.data;
  const row = await prisma.bodyMetric.create({
    data: {
      capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
      ...rest,
    },
  });
  return NextResponse.json(row, { status: 201 });
}
