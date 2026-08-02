import { redirect, type Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { SESSION_COOKIE, validateSession } from '$lib/server/auth/session';

const PUBLIC_ROUTES = ['/login'];

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get(SESSION_COOKIE);
  event.locals.user = sessionId ? await validateSession(db, sessionId) : null;
  if (sessionId && !event.locals.user) {
    event.cookies.delete(SESSION_COOKIE, { path: '/' });
  }

  const isPublic = PUBLIC_ROUTES.includes(event.url.pathname);
  if (!event.locals.user && !isPublic) {
    // Preserve the full path including query string so login returns the
    // user to exactly where they were headed.
    const target = `${event.url.pathname}${event.url.search}`;
    throw redirect(303, `/login?next=${encodeURIComponent(target)}`);
  }
  if (event.locals.user && isPublic) {
    throw redirect(303, '/');
  }

  return resolve(event);
};
