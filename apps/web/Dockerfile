# syntax=docker/dockerfile:1
# Build from the repo root:  docker build -f apps/web/Dockerfile -t venue-web .
# Each replica:              docker run -p 3000:3000 -e API_URL=http://api:4000 -e API_KEY=... venue-web

FROM node:22-slim AS build
ENV COREPACK_HOME=/opt/corepack
RUN corepack enable && corepack prepare yarn@4.18.1 --activate
WORKDIR /app
# The package files come first, so a code change does not install the dependencies again.
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contract/package.json packages/contract/
RUN yarn workspaces focus @venue/web
# Both tsconfig files of the workspace extend this one.
COPY tsconfig.base.json ./
COPY packages/contract packages/contract
COPY apps/web apps/web
# The standalone output holds the server and only the dependencies that it uses.
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1
RUN yarn workspace @venue/web build

FROM node:22-slim AS runtime
# API_URL and API_KEY are read at run time, on the server only. Set them for each environment.
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
