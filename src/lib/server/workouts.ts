import { and, desc, eq, lt, sql } from 'drizzle-orm';
import type { Db } from './db/connect';
import { workoutSessions, workoutSets } from './db/schema';
import type { SessionType } from '../dates';

export function getOrCreateSession(
  db: Db,
  userId: number,
  date: string,
  sessionType: SessionType,
  now: Date = new Date()
): { id: number; date: string; sessionType: string } {
  const existing = db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.date, date),
        eq(workoutSessions.sessionType, sessionType)
      )
    )
    .limit(1)
    .all();
  if (existing[0]) return existing[0];
  const [created] = db
    .insert(workoutSessions)
    .values({ userId, date, sessionType, createdAt: now.toISOString() })
    .returning()
    .all();
  return created;
}

function ownedSession(db: Db, userId: number, sessionId: number) {
  const [session] = db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
    .limit(1)
    .all();
  if (!session) throw new Error('No such session for this user');
  return session;
}

export function logSet(
  db: Db,
  userId: number,
  sessionId: number,
  exerciseId: number,
  weightKg: number,
  reps: number,
  now: Date = new Date()
): void {
  ownedSession(db, userId, sessionId);
  if (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > 1000) {
    throw new Error('weightKg out of range');
  }
  if (!Number.isInteger(reps) || reps < 1 || reps > 100) throw new Error('reps out of range');
  const [maxRow] = db
    .select({ n: sql<number>`coalesce(max(${workoutSets.setNumber}), 0)` })
    .from(workoutSets)
    .where(and(eq(workoutSets.sessionId, sessionId), eq(workoutSets.exerciseId, exerciseId)))
    .all();
  db.insert(workoutSets)
    .values({
      sessionId,
      exerciseId,
      setNumber: (maxRow?.n ?? 0) + 1,
      weightKg,
      reps,
      createdAt: now.toISOString()
    })
    .run();
}

export function setsForSession(db: Db, sessionId: number) {
  return db
    .select()
    .from(workoutSets)
    .where(eq(workoutSets.sessionId, sessionId))
    .orderBy(workoutSets.exerciseId, workoutSets.setNumber)
    .all();
}

export function lastSetsForExercise(
  db: Db,
  userId: number,
  exerciseId: number,
  beforeDate: string
): { date: string; sets: Array<{ setNumber: number; weightKg: number; reps: number }> } | null {
  const [prior] = db
    .select({ id: workoutSessions.id, date: workoutSessions.date })
    .from(workoutSessions)
    .innerJoin(workoutSets, eq(workoutSets.sessionId, workoutSessions.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSets.exerciseId, exerciseId),
        lt(workoutSessions.date, beforeDate)
      )
    )
    .orderBy(desc(workoutSessions.date))
    .limit(1)
    .all();
  if (!prior) return null;
  const sets = db
    .select({
      setNumber: workoutSets.setNumber,
      weightKg: workoutSets.weightKg,
      reps: workoutSets.reps
    })
    .from(workoutSets)
    .where(and(eq(workoutSets.sessionId, prior.id), eq(workoutSets.exerciseId, exerciseId)))
    .orderBy(workoutSets.setNumber)
    .all();
  return { date: prior.date, sets };
}

export function deleteSet(db: Db, userId: number, setId: number): void {
  const [row] = db
    .select({ id: workoutSets.id, sessionId: workoutSets.sessionId })
    .from(workoutSets)
    .innerJoin(workoutSessions, eq(workoutSessions.id, workoutSets.sessionId))
    .where(and(eq(workoutSets.id, setId), eq(workoutSessions.userId, userId)))
    .limit(1)
    .all();
  if (row) db.delete(workoutSets).where(eq(workoutSets.id, row.id)).run();
}
