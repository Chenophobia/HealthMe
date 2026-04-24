import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { normalizeToLocalMidnight } from "@/lib/date-normalize";

const TZ = process.env.APP_TZ ?? "UTC";

const RangeToDays: Record<string, number | null> = {
  "7d": 7, "30d": 30, "90d": 90, "365d": 365, "all": null,
};

const PostSchema = z.object({
  date: z.string(),
  activeKcal: z.number().int().nonnegative(),
  source: z.enum(["SHORTCUT", "MANUAL"]).default("SHORTCUT"),
});

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = RangeToDays[range];
  const where = days == null ? {} : { loggedAt: { gte: new Date(Date.now() - days * 86400_000) } };
  const rows = await prisma.activityLog.findMany({ where, orderBy: { loggedAt: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { date, activeKcal, source } = parsed.data;
  const loggedAt = normalizeToLocalMidnight(date, TZ);
  const row = await prisma.activityLog.upsert({
    where: { loggedAt_source: { loggedAt, source } },
    create: { loggedAt, activeKcal, source },
    update: { activeKcal },
  });
  return NextResponse.json({ ok: true, id: row.id });
}
