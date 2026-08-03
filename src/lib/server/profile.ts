import { eq } from 'drizzle-orm';
import type { Db } from './db/connect';
import { users } from './db/schema';
import { isValidDate, todayLocal } from '$lib/dates';
import { ageOn, type BodyProfile } from '$lib/energy';

/*
 * Standing facts about the body, set once, that let the app estimate resting
 * burn from the weight it already tracks. Kept on the user row rather than in
 * a table of their own: strictly one per user, and never queried apart from
 * the user.
 */

export function getProfile(db: Db, userId: number): BodyProfile {
  const [row] = db
    .select({
      heightCm: users.heightCm,
      birthDate: users.birthDate,
      sex: users.sex,
      goalWeightKg: users.goalWeightKg,
      goalDate: users.goalDate
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .all();
  return row ?? { heightCm: null, birthDate: null, sex: null, goalWeightKg: null, goalDate: null };
}

export function setProfile(
  db: Db,
  userId: number,
  profile: {
    heightCm?: number | null;
    birthDate?: string | null;
    sex?: string | null;
    goalWeightKg?: number | null;
    goalDate?: string | null;
  },
  today: string = todayLocal()
): void {
  const heightCm = profile.heightCm ?? null;
  if (heightCm !== null && (!Number.isFinite(heightCm) || heightCm < 50 || heightCm > 260)) {
    throw new Error('heightCm out of range');
  }

  const birthDate = profile.birthDate ?? null;
  if (birthDate !== null) {
    if (!isValidDate(birthDate)) throw new Error('birthDate must be a real day');
    const age = ageOn(birthDate, today);
    if (age === null || birthDate > today) throw new Error('birthDate out of range');
  }

  const sex = profile.sex ?? null;
  if (sex !== null && sex !== 'male' && sex !== 'female') {
    throw new Error('sex must be male or female');
  }

  const goalWeightKg = profile.goalWeightKg ?? null;
  if (
    goalWeightKg !== null &&
    (!Number.isFinite(goalWeightKg) || goalWeightKg < 30 || goalWeightKg > 500)
  ) {
    throw new Error('goalWeightKg out of range');
  }

  const goalDate = profile.goalDate ?? null;
  if (goalDate !== null && !isValidDate(goalDate)) {
    throw new Error('goalDate must be a real day');
  }

  db.update(users)
    .set({ heightCm, birthDate, sex, goalWeightKg, goalDate })
    .where(eq(users.id, userId))
    .run();
}
