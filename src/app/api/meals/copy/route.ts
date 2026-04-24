import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeToLocalMidnight } from "@/lib/date-normalize";

const TZ = process.env.APP_TZ ?? "UTC";

const Schema = z.object({
  fromDate: z.string(),
  toDate: z.string(),
  slots: z.array(z.enum(["BREAKFAST", "LUNCH", "SNACK", "DINNER"])).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { fromDate, toDate, slots } = parsed.data;
  const from = normalizeToLocalMidnight(fromDate, TZ);
  const to = normalizeToLocalMidnight(toDate, TZ);
  const source = await prisma.mealLog.findMany({
    where: { consumedAt: from, ...(slots ? { slot: { in: slots } } : {}) },
  });
  const created = await prisma.$transaction(
    source.map((s) =>
      prisma.mealLog.create({
        data: {
          consumedAt: to,
          slot: s.slot,
          recipeId: s.recipeId,
          servings: s.servings,
          quickName: s.quickName,
          quickKcal: s.quickKcal,
          quickProteinG: s.quickProteinG,
          quickCarbsG: s.quickCarbsG,
          quickFatG: s.quickFatG,
        },
      }),
    ),
  );
  return NextResponse.json({ copied: created.length });
}
