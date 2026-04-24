import { prisma } from "@/lib/prisma";
import { MetricsClient } from "./metrics-client";

export default async function MetricsPage() {
  const metrics = await prisma.bodyMetric.findMany({ orderBy: { capturedAt: "asc" } });
  const goals = await prisma.goal.findMany({ where: { active: true } });
  const serMetrics = metrics.map((m) => ({ ...m, capturedAt: m.capturedAt.toISOString(), createdAt: m.createdAt.toISOString() }));
  const serGoals = goals.map((g) => ({ ...g, targetDate: g.targetDate.toISOString(), createdAt: g.createdAt.toISOString() }));
  return <MetricsClient metrics={serMetrics} goals={serGoals} />;
}
