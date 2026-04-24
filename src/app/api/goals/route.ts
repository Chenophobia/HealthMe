import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  metric: z.enum(["WEIGHT_KG","BODY_FAT_PCT","SKELETAL_MUSCLE_KG","BMI","MUSCLE_MASS_KG","VISCERAL_FAT"]),
  targetValue: z.number(),
  targetDate: z.string(),
});

export async function GET() {
  const rows = await prisma.goal.findMany({ orderBy: [{ active: "desc" }, { createdAt: "desc" }] });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { metric, targetValue, targetDate } = parsed.data;
  const goal = await prisma.$transaction(async (tx) => {
    await tx.goal.updateMany({ where: { metric, active: true }, data: { active: false } });
    return tx.goal.create({ data: { metric, targetValue, targetDate: new Date(targetDate), active: true } });
  });
  return NextResponse.json(goal, { status: 201 });
}
