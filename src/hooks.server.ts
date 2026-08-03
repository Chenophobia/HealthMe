import { redirect, type Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { SESSION_COOKIE, validateSession } from '$lib/server/auth/session';

const PUBLIC_ROUTES = ['/login'];

/*
 * Authenticated by bearer token rather than by session cookie. These have to
 * skip the redirect below: an Apple Shortcut posting activity has no cookie
 * jar, and a 303 to /login would be reported back as a success. The route
 * checks its own token and answers 401 itself.
 */
const TOKEN_ROUTES = ['/api/activity'];

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get(SESSION_COOKIE);
  event.locals.user = sessionId ? await validateSession(db, sessionId) : null;
  if (sessionId && !event.locals.user) {
    event.cookies.delete(SESSION_COOKIE, { path: '/' });
  }

  const isPublic = PUBLIC_ROUTES.includes(event.url.pathname);
  const isTokenRoute = TOKEN_ROUTES.includes(event.url.pathname);
  if (!event.locals.user && !isPublic && !isTokenRoute) {
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
