import { describe, it, expect } from 'vitest';
import { createTestDb } from './db/test-db';
import { users } from './db/schema';
import { getProfile, setProfile } from './profile';

function setup() {
  const db = createTestDb();
  const [user] = db
    .insert(users)
    .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
    .returning()
    .all();
  return { db, user };
}

describe('body profile', () => {
  it('is empty for a fresh account', () => {
    const { db, user } = setup();
    expect(getProfile(db, user.id)).toEqual({
      heightCm: null,
      birthDate: null,
      sex: null,
      goalWeightKg: null,
      goalDate: null
    });
  });

  it('round-trips what was set', () => {
    const { db, user } = setup();
    setProfile(db, user.id, { heightCm: 169, birthDate: '1997-02-28', sex: 'male' });
    expect(getProfile(db, user.id)).toEqual({
      heightCm: 169,
      birthDate: '1997-02-28',
      sex: 'male',
      goalWeightKg: null,
      goalDate: null
    });
  });

  it('clears a field when handed an explicit null', () => {
    const { db, user } = setup();
    setProfile(db, user.id, { heightCm: 169, birthDate: '1997-02-28', sex: 'male' });
    setProfile(db, user.id, { heightCm: null, birthDate: null, sex: null });
    expect(getProfile(db, user.id)).toEqual({
      heightCm: null,
      birthDate: null,
      sex: null,
      goalWeightKg: null,
      goalDate: null
    });
  });

  /* The body facts and the goal are edited by two separate forms, so a write
     from one must not touch the other's columns. */
  it('leaves keys it was not given alone', () => {
    const { db, user } = setup();
    setProfile(db, user.id, { heightCm: 169, birthDate: '1997-02-28', sex: 'male' });
    setProfile(db, user.id, { goalWeightKg: 76, goalDate: '2026-09-08' });
    expect(getProfile(db, user.id)).toEqual({
      heightCm: 169,
      birthDate: '1997-02-28',
      sex: 'male',
      goalWeightKg: 76,
      goalDate: '2026-09-08'
    });

    // And the reverse: saving the body facts must not wipe the goal.
    setProfile(db, user.id, { heightCm: 170, birthDate: '1997-02-28', sex: 'male' });
    expect(getProfile(db, user.id)).toMatchObject({
      heightCm: 170,
      goalWeightKg: 76,
      goalDate: '2026-09-08'
    });
  });

  it('does nothing at all when handed an empty patch', () => {
    const { db, user } = setup();
    setProfile(db, user.id, { heightCm: 169 });
    setProfile(db, user.id, {});
    expect(getProfile(db, user.id).heightCm).toBe(169);
  });

  it('rejects a goal weight that is out of range', () => {
    const { db, user } = setup();
    expect(() => setProfile(db, user.id, { goalWeightKg: 5 })).toThrow();
    expect(() => setProfile(db, user.id, { goalDate: 'september' })).toThrow();
  });

  it('rejects a height that is really a metre reading, or a typo', () => {
    const { db, user } = setup();
    expect(() => setProfile(db, user.id, { heightCm: 1.69 })).toThrow();
    expect(() => setProfile(db, user.id, { heightCm: 1690 })).toThrow();
    expect(() => setProfile(db, user.id, { heightCm: Number.NaN })).toThrow();
  });

  it('rejects a birth date that is malformed or in the future', () => {
    const { db, user } = setup();
    const today = '2026-08-03';
    expect(() => setProfile(db, user.id, { birthDate: '28-02-1997' }, today)).toThrow();
    expect(() => setProfile(db, user.id, { birthDate: '1997-02-30' }, today)).toThrow();
    expect(() => setProfile(db, user.id, { birthDate: '2027-01-01' }, today)).toThrow();
  });

  it('rejects a sex the formula has no coefficient for', () => {
    const { db, user } = setup();
    expect(() => setProfile(db, user.id, { sex: 'unspecified' })).toThrow();
  });

  it('leaves other users alone', () => {
    const { db, user } = setup();
    const [other] = db
      .insert(users)
      .values({ username: 'other', passwordHash: 'x', createdAt: 'now' })
      .returning()
      .all();
    setProfile(db, user.id, { heightCm: 169 });
    expect(getProfile(db, other.id).heightCm).toBeNull();
  });
});
