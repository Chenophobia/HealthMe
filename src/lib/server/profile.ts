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

export type ProfilePatch = {
  heightCm?: number | null;
  birthDate?: string | null;
  sex?: string | null;
  goalWeightKg?: number | null;
  goalDate?: string | null;
};

/**
 * Partial update: only the keys actually present are written.
 *
 * This matters now that the body facts and the goal are edited by two separate
 * forms — a whole-row write would have each form silently wipe the other's
 * fields on every save. Passing an explicit `null` still clears a field;
 * leaving the key out leaves it alone.
 */
export function setProfile(
  db: Db,
  userId: number,
  profile: ProfilePatch,
  today: string = todayLocal()
): void {
  const update: ProfilePatch = {};

  if ('heightCm' in profile) {
    const heightCm = profile.heightCm ?? null;
    if (heightCm !== null && (!Number.isFinite(heightCm) || heightCm < 50 || heightCm > 260)) {
      throw new Error('heightCm out of range');
    }
    update.heightCm = heightCm;
  }

  if ('birthDate' in profile) {
    const birthDate = profile.birthDate ?? null;
    if (birthDate !== null) {
      if (!isValidDate(birthDate)) throw new Error('birthDate must be a real day');
      const age = ageOn(birthDate, today);
      if (age === null || birthDate > today) throw new Error('birthDate out of range');
    }
    update.birthDate = birthDate;
  }

  if ('sex' in profile) {
    const sex = profile.sex ?? null;
    if (sex !== null && sex !== 'male' && sex !== 'female') {
      throw new Error('sex must be male or female');
    }
    update.sex = sex;
  }

  if ('goalWeightKg' in profile) {
    const goalWeightKg = profile.goalWeightKg ?? null;
    if (
      goalWeightKg !== null &&
      (!Number.isFinite(goalWeightKg) || goalWeightKg < 30 || goalWeightKg > 500)
    ) {
      throw new Error('goalWeightKg out of range');
    }
    update.goalWeightKg = goalWeightKg;
  }

  if ('goalDate' in profile) {
    const goalDate = profile.goalDate ?? null;
    if (goalDate !== null && !isValidDate(goalDate)) {
      throw new Error('goalDate must be a real day');
    }
    update.goalDate = goalDate;
  }

  if (Object.keys(update).length === 0) return;
  db.update(users).set(update).where(eq(users.id, userId)).run();
}
