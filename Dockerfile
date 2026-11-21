# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH HUSKY=0 NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/engine/package.json packages/engine/
COPY packages/data/package.json packages/data/
COPY packages/contracts/package.json packages/contracts/
COPY packages/db/package.json packages/db/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS source
COPY . .

# Background jobs and migrations (runs TypeScript directly with tsx).
FROM source AS worker
ENV NODE_ENV=production
USER node
CMD ["pnpm", "--filter", "worker", "start"]

FROM source AS build
ARG GIT_SHA=dev
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG NEXT_PUBLIC_PRIVACY_CONTACT=
ENV GIT_SHA=$GIT_SHA NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN NEXT_PUBLIC_PRIVACY_CONTACT=$NEXT_PUBLIC_PRIVACY_CONTACT
RUN pnpm --filter web build

FROM node:22-alpine AS web
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=app:app /app/apps/web/public ./apps/web/public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "apps/web/server.js"]
