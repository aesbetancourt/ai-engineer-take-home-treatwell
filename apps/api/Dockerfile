# syntax=docker/dockerfile:1
# Build from the repo root:  docker build -f apps/api/Dockerfile -t venue-api .
# Release step, one time:    docker run --rm -v venue-data:/data venue-api yarn db:migrate
# Each replica:              docker run -p 4000:4000 -v venue-data:/data -e API_KEY=... venue-api
# See docs/migrations.md.

FROM node:22-slim AS base
# Yarn comes from corepack. This directory holds it, so the non-root user needs no download at run time.
ENV COREPACK_HOME=/opt/corepack
RUN corepack enable && corepack prepare yarn@4.18.1 --activate && chmod -R a+rX /opt/corepack
WORKDIR /app

# Production dependencies only. The package files come first, so a code change does not install them again.
FROM base AS deps
# better-sqlite3 has a native part. These tools build it when no prebuilt binary fits. They stay in this stage.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contract/package.json packages/contract/
RUN yarn workspaces focus @venue/api --production

FROM base AS runtime
ENV NODE_ENV=production PORT=4000 DB_PATH=/data/backoffice.db
COPY --from=deps /app ./
# The tsconfig of the API extends this one, and tsx reads it.
COPY tsconfig.base.json ./
COPY packages/contract packages/contract
COPY apps/api/package.json apps/api/tsconfig.json apps/api/
COPY apps/api/drizzle apps/api/drizzle
COPY apps/api/src apps/api/src
# The database file is on a volume that the replicas share. The non-root user owns it.
RUN mkdir /data && chown node:node /data
VOLUME /data
USER node
WORKDIR /app/apps/api
EXPOSE 4000
# The image has no curl, so node makes the request.
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
# The start script never changes the schema. It closes the server on SIGTERM.
CMD ["yarn", "start"]
