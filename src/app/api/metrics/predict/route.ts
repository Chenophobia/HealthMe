import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { linearRegression, project } from "@/lib/regression";
import { METRIC_FIELDS } from "@/lib/metric-fields";

const Schema = z.object({
  metric: z.string(),
  horizonDays: z.number().int().positive().default(30),
  lookbackDays: z.number().int().positive().default(60),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { metric, horizonDays, lookbackDays } = parsed.data;
  const field = METRIC_FIELDS.find((f) => f.key === metric);
  if (!field) return NextResponse.json({ error: "unknown_metric" }, { status: 400 });

  const since = new Date(Date.now() - lookbackDays * 86400_000);
  const rows = await prisma.bodyMetric.findMany({
    where: { capturedAt: { gte: since } },
    orderBy: { capturedAt: "asc" },
  });

  const points = rows
    .map((r) => ({
      x: (r.capturedAt.getTime() - since.getTime()) / 86400_000,
      y: (r as unknown as Record<string, number | null>)[metric],
    }))
    .filter((p): p is { x: number; y: number } => p.y != null);

  const reg = linearRegression(points);
  if (!reg) return NextResponse.json({ error: "insufficient_data", pointsAvailable: points.length });

  const projections: { daysAhead: number; value: number }[] = [];
  const lastX = points[points.length - 1]?.x ?? 0;
  for (let d = 0; d <= horizonDays; d += 7) {
    projections.push({ daysAhead: d, value: +project(reg, lastX + d).toFixed(3) });
  }
  return NextResponse.json({
    metric,
    slope: reg.slope,
    intercept: reg.intercept,
    pointsUsed: points.length,
    projections,
  });
}
