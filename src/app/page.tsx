export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./dashboard-client";
import { normalizeToLocalMidnight } from "@/lib/date-normalize";
import { METRIC_FIELDS } from "@/lib/metric-fields";
import { SealChop } from "@/components/seal-chop";

const TZ = process.env.APP_TZ ?? "UTC";

export default async function DashboardPage() {
  const today = normalizeToLocalMidnight(new Date().toISOString().slice(0, 10), TZ);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400_000);

  const [metrics, mealsToday, activityToday, goals] = await Promise.all([
    prisma.bodyMetric.findMany({
      where: { capturedAt: { gte: thirtyDaysAgo } },
      orderBy: { capturedAt: "asc" },
    }),
    prisma.mealLog.findMany({
      where: { consumedAt: today },
      include: { recipe: true },
    }),
    prisma.activityLog.findFirst({
      where: { loggedAt: today },
      orderBy: { createdAt: "desc" },
    }),
    prisma.goal.findMany({ where: { active: true } }),
  ]);

  const latest = metrics[metrics.length - 1];
  const bmr = latest?.bmrKcal ?? 1800;
  const active = activityToday?.activeKcal ?? 0;
  const intake = mealsToday.reduce((sum, m) => {
    if (m.recipe && m.servings != null) {
      const factor = m.servings / m.recipe.servings;
      return sum + Math.round(m.recipe.kcal * factor);
    }
    return sum + (m.quickKcal ?? 0);
  }, 0);

  const primary = METRIC_FIELDS.filter((f) => f.dashboardPrimary);
  const secondary = METRIC_FIELDS.filter((f) => !f.dashboardPrimary);

  const serMetrics = metrics.map((m) => ({ ...m, capturedAt: m.capturedAt.toISOString(), createdAt: m.createdAt.toISOString() }));
  const serGoals = goals.map((g) => ({ ...g, targetDate: g.targetDate.toISOString(), createdAt: g.createdAt.toISOString() }));

  return (
    <div className="relative min-h-full pb-16">
      <DashboardClient
        metrics={serMetrics}
        primary={primary}
        secondary={secondary}
        goals={serGoals}
        intake={intake}
        bmr={bmr}
        active={active}
      />
      <SealChop />
    </div>
  );
}
