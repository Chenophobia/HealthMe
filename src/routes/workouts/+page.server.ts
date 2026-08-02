import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { exercises } from '$lib/server/db/schema';
import { todayLocal, scheduledSessionFor, type SessionType } from '$lib/dates';
import type { PageServerLoad } from './$types';

const SESSION_TYPES: SessionType[] = ['push', 'pull', 'legs'];

export const load: PageServerLoad = async ({ url }) => {
  const date = todayLocal();
  const scheduled = scheduledSessionFor(date);
  const picked = url.searchParams.get('session');
  const sessionType = (SESSION_TYPES as string[]).includes(picked ?? '')
    ? (picked as SessionType)
    : (scheduled ?? 'push');

  return {
    date,
    scheduled,
    sessionType,
    exercises: db
      .select()
      .from(exercises)
      .where(eq(exercises.sessionType, sessionType))
      .orderBy(asc(exercises.displayOrder))
      .all()
  };
};
