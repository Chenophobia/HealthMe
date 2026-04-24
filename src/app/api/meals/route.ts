import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { normalizeToLocalMidnight } from "@/lib/date-normalize";

const TZ = process.env.APP_TZ ?? "UTC";

const CreateSchema = z.object({
  date: z.string(),
  slot: z.enum(["BREAKFAST", "LUNCH", "SNACK", "DINNER"]),
  recipeId: z.number().int().optional(),
  servings: z.number().positive().optional(),
  quick: z.object({
    name: z.string(),
    kcal: z.number().int(),
    proteinG: z.number(),
    carbsG: z.number(),
    fatG: z.number(),
  }).optional(),
}).refine(
  (d) => (d.recipeId != null) !== (d.quick != null),
  "Provide exactly one of recipeId or quick"
);

export async function GET(req: NextRequest) {
  const dateStr = req.nextUrl.searchParams.get("date");
  if (!dateStr) return NextResponse.json({ error: "date required" }, { status: 400 });
  const day = normalizeToLocalMidnight(dateStr, TZ);
  const rows = await prisma.mealLog.findMany({
    where: { consumedAt: day },
    include: { recipe: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const d = parsed.data;
  const consumedAt = normalizeToLocalMidnight(d.date, TZ);
  const row = await prisma.mealLog.create({
    data: {
      consumedAt,
      slot: d.slot,
      recipeId: d.recipeId,
      servings: d.servings,
      quickName: d.quick?.name,
      quickKcal: d.quick?.kcal,
      quickProteinG: d.quick?.proteinG,
      quickCarbsG: d.quick?.carbsG,
      quickFatG: d.quick?.fatG,
    },
  });
  return NextResponse.json(row, { status: 201 });
}
