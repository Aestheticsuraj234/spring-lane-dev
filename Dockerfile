# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable && corepack prepare pnpm@11.20.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json prisma.config.ts ./
COPY prisma prisma/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile

FROM deps AS source
COPY packages/shared packages/shared
COPY packages/db packages/db
COPY apps/api apps/api
COPY apps/worker apps/worker
COPY apps/web apps/web

FROM source AS api
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "@spring-lane/api", "start"]

FROM source AS worker
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    openjdk-17-jdk-headless \
    git \
    ca-certificates \
    docker.io \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@spring-lane/worker", "start"]

FROM source AS web-build
RUN pnpm --filter @spring-lane/web build

FROM nginx:1.27-alpine AS web
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
