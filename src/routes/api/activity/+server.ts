/*
 * Where the iPhone posts its Active Energy.
 *
 * Apple Health has no web API, so nothing can pull this — a Shortcuts
 * automation on the phone pushes it here on a schedule. See README.md
 * ("Apple Health activity") for building the Shortcut.
 *
 *   POST /api/activity
 *   Authorization: Bearer <token from npm run create-api-token>
 *   { "activeKcal": 542, "date": "2026-08-03" }   // date optional, defaults to today
 *
 * Re-posting a day overwrites it, because the Shortcut sends a running total
 * that grows through the day.
 */
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { setActiveEnergy } from '$lib/server/activity';
import { bearerToken, verifyApiToken } from '$lib/server/auth/api-token';
import { todayLocal, isValidDate } from '$lib/dates';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const auth = verifyApiToken(db, bearerToken(request.headers.get('authorization')));
  if (!auth) {
    return json({ error: 'Missing or invalid bearer token.' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Body must be JSON.' }, { status: 400 });
  }
  if (typeof payload !== 'object' || payload === null) {
    return json({ error: 'Body must be a JSON object.' }, { status: 400 });
  }

  const body = payload as { date?: unknown; activeKcal?: unknown };
  const today = todayLocal();
  const date = body.date === undefined || body.date === null ? today : String(body.date);
  if (!isValidDate(date)) {
    return json({ error: 'date must be a real day in YYYY-MM-DD form.' }, { status: 400 });
  }
  if (date > today) {
    return json({ error: 'date cannot be in the future.' }, { status: 400 });
  }

  const activeKcal = Number(body.activeKcal);
  if (!Number.isFinite(activeKcal)) {
    return json({ error: 'activeKcal must be a number.' }, { status: 400 });
  }

  try {
    setActiveEnergy(db, auth.userId, { date, activeKcal, source: 'shortcut' });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 400 });
  }

  return json({ ok: true, date, activeKcal: Math.round(activeKcal) });
};
