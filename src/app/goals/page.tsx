export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { GoalsClient } from "./goals-client";
import { METRIC_FIELDS } from "@/lib/metric-fields";
import { linearRegression, project } from "@/lib/regression";

export default async function GoalsPage() {
  const goals = await prisma.goal.findMany({ orderBy: [{ active: "desc" }, { createdAt: "desc" }] });
  const metrics = await prisma.bodyMetric.findMany({
    where: { capturedAt: { gte: new Date(Date.now() - 60 * 86400_000) } },
    orderBy: { capturedAt: "asc" },
  });

  const projections: Record<string, number> = {};
  for (const g of goals.filter((x) => x.active)) {
    const field = METRIC_FIELDS.find((f) => f.goalEnum === g.metric);
    if (!field) continue;
    const pts = metrics
      .map((m) => ({ x: m.capturedAt.getTime() / 86400_000, y: (m as unknown as Record<string, number | null>)[field.key] }))
      .filter((p): p is { x: number; y: number } => p.y != null);
    const reg = linearRegression(pts);
    if (reg) {
      const targetX = g.targetDate.getTime() / 86400_000;
      projections[g.id] = project(reg, targetX);
    }
  }

  const ser = goals.map((g) => ({ ...g, targetDate: g.targetDate.toISOString(), createdAt: g.createdAt.toISOString() }));
  return <GoalsClient goals={ser} projections={projections} />;
}
