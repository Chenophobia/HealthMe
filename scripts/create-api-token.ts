/**
 * Mints a bearer token for the Apple Shortcut that posts Active Energy.
 *
 * The token is printed once and never recoverable — only its SHA-256 digest
 * is stored. Lost one? Mint another; they are per-device and additive.
 *
 * Usage (env vars, matching create-user, so the name of the device you're
 * pairing doesn't need quoting gymnastics and nothing secret is in argv):
 *
 *   CREATE_API_TOKEN_USERNAME=someone CREATE_API_TOKEN_NAME=iphone-shortcut \
 *     npm run create-api-token
 *
 * Against the deployed container, stop the app first so exactly one process
 * ever touches app.db (see README.md):
 *
 *   docker compose stop
 *   docker compose run --rm \
 *     -e CREATE_API_TOKEN_USERNAME=someone -e CREATE_API_TOKEN_NAME=iphone-shortcut \
 *     app npm run create-api-token
 *   docker compose start
 */
import { createApiToken } from '../src/lib/server/auth/api-token';
import { findUserByUsername } from '../src/lib/server/auth/users';
import { db } from '../src/lib/server/db';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function main() {
  const username = process.env.CREATE_API_TOKEN_USERNAME;
  const name = process.env.CREATE_API_TOKEN_NAME ?? 'iphone-shortcut';

  if (!username) {
    fail(
      'Usage: CREATE_API_TOKEN_USERNAME=<username> [CREATE_API_TOKEN_NAME=<label>] npm run create-api-token'
    );
  }

  const user = findUserByUsername(db, username);
  if (!user) fail(`No such user: "${username}".`);

  const token = createApiToken(db, user.id, name);

  console.log(`Created API token "${name}" for ${user.username}.`);
  console.log('\nThis is the only time it is shown. Paste it into the Shortcut now:\n');
  console.log(`  ${token}\n`);
  process.exit(0);
}

main();
