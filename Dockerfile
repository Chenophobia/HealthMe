FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
# better-sqlite3 ships prebuilt binaries linked against a newer glibc than
# node:22-slim ships, so they fail at runtime (ERR_DLOPEN_FAILED) even though
# `npm ci` succeeds. Compile a matching binary, then remove the bundled
# prebuilds so better-sqlite3's loader falls back to the one we just built.
RUN npm install --global node-gyp \
  && cd node_modules/better-sqlite3 && node-gyp rebuild --release --force_build=1 \
  && rm -rf prebuilds

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3002 HOST=0.0.0.0 DATA_DIR=/app/data
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/package.json ./package.json
# Needed at runtime for `npm run create-user` / `set-password` / `reseed`:
# they run off TypeScript source via tsx (a production dependency), reusing
# the app's own db/auth modules.
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src/lib/server ./src/lib/server
EXPOSE 3002
CMD ["node", "build/index.js"]
