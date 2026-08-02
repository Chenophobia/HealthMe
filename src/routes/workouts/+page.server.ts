import { fail } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { exercises, workoutSessions } from '$lib/server/db/schema';
import { todayLocal, scheduledSessionFor, type SessionType } from '$lib/dates';
import {
  getOrCreateSession,
  logSet,
  setsForSession,
  lastSetsForExercise,
  deleteSet
} from '$lib/server/workouts';
import type { Actions, PageServerLoad } from './$types';

const SESSION_TYPES: SessionType[] = ['push', 'pull', 'legs'];

function getExistingSession(userId: number, date: string, sessionType: string) {
  return db
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
    .all()[0];
}

export const load: PageServerLoad = async ({ locals, url }) => {
  const date = todayLocal();
  const scheduled = scheduledSessionFor(date);
  const picked = url.searchParams.get('session');
  const sessionType = (SESSION_TYPES as string[]).includes(picked ?? '')
    ? (picked as SessionType)
    : (scheduled ?? 'push');

  const list = db
    .select()
    .from(exercises)
    .where(eq(exercises.sessionType, sessionType))
    .orderBy(asc(exercises.displayOrder))
    .all();

  // Read-only view: don't create a session row just for looking at the page.
  const existing = getExistingSession(locals.user!.id, date, sessionType);
  const loggedSets = existing ? setsForSession(db, existing.id) : [];

  return {
    date,
    scheduled,
    sessionType,
    exercises: list.map((e) => ({
      ...e,
      last: lastSetsForExercise(db, locals.user!.id, e.id, date),
      todaySets: loggedSets.filter((s) => s.exerciseId === e.id)
    }))
  };
};

export const actions: Actions = {
  logset: async ({ request, locals }) => {
    const form = await request.formData();
    const sessionType = String(form.get('sessionType')) as SessionType;
    if (!SESSION_TYPES.includes(sessionType)) return fail(400, { error: 'Bad session type.' });
    try {
      const session = getOrCreateSession(db, locals.user!.id, todayLocal(), sessionType);
      logSet(
        db,
        locals.user!.id,
        session.id,
        Number(form.get('exerciseId')),
        Number(form.get('weightKg')),
        Number(form.get('reps'))
      );
    } catch {
      return fail(400, { error: 'Weight and reps must be sensible numbers.' });
    }
    return { ok: true };
  },
  deleteset: async ({ request, locals }) => {
    const form = await request.formData();
    deleteSet(db, locals.user!.id, Number(form.get('id')));
    return { ok: true };
  }
};
