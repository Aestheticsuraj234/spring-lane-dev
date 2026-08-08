# Spring Lane

Internal one-click deploy platform for Spring Boot apps: connect a GitHub repo, click **Deploy**, get a live HTTPS URL. No Dockerfile, no manual server config.

## How it works

1. Log in with GitHub (restricted to members of `GITHUB_ORG`).
2. Pick a repo + branch and register it as an app.
3. Click deploy. A worker clones the repo, builds an OCI image with Cloud Native Buildpacks (`./mvnw spring-boot:build-image` or `./gradlew bootBuildImage`), and runs it as a Docker container.
4. Traefik routes `https://<app-name>.<BASE_DOMAIN>` to the container and manages TLS via Let's Encrypt.
5. Build logs stream live to the dashboard; container logs, redeploy, stop/restart/delete, and encrypted env vars are managed from the app page.

## Repo layout

```
apps/
  api/      Express control plane (REST + Socket.IO log relay)
  worker/   BullMQ consumer: clone -> buildpacks build -> deploy container
  web/      React (Vite) dashboard
packages/
  shared/   Types and socket/queue contracts shared across apps
prisma/     Database schema and migrations
```

## Prerequisites

- Node.js 20+ and pnpm 9+
- Docker (Docker Desktop locally; Docker Engine on the VPS)
- JDK 17+ on the machine running the worker (the target repo's Maven/Gradle wrapper runs the buildpack build)
- A GitHub OAuth App (client ID/secret) authorized for your org

## Local development

```bash
pnpm install
cp .env.example .env   # fill in GitHub OAuth credentials, ENCRYPTION_KEY, SESSION_SECRET

# start Postgres, Redis, Traefik (compose files land in the infra milestone)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

pnpm dev               # runs api, worker, and web in parallel
```

- Dashboard: http://localhost:5173
- API: http://localhost:3000
- Deployed apps (dev): http://\<app-name\>.localhost

## Useful scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run api, worker, and web in watch mode |
| `pnpm typecheck` | Type-check every workspace package |
| `pnpm build` | Build all packages |
| `pnpm test` | Run tests across the workspace |

## Environment variables

See [.env.example](.env.example) for the full annotated list. The important ones:

- `BASE_DOMAIN` — apps are exposed at `<app-name>.<BASE_DOMAIN>` (use `localhost` in dev)
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITHUB_ORG` — OAuth login, org-gated
- `ENCRYPTION_KEY` — 32-byte hex key; encrypts GitHub tokens and app env vars at rest
- `BUILD_CONCURRENCY` — max simultaneous builds (default 2)
