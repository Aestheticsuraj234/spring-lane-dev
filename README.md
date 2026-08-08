# Spring Lane

Internal one-click deploy platform for Spring Boot apps: connect a GitHub repo, click **Deploy**, get a live HTTPS URL. No Dockerfile, no manual server config.

## How it works

1. Log in with GitHub — any GitHub account can sign in.
2. Pick a repo + branch and register it as an app.
3. Click deploy. A worker clones the repo, builds an OCI image with Cloud Native Buildpacks (Paketo via `pack`), and runs it as a Docker container.
4. Traefik routes `https://<app-name>.<BASE_DOMAIN>` to the container and manages TLS via Let's Encrypt.
5. Build logs stream live to the dashboard; container logs, redeploy, stop/restart/delete, and encrypted env vars are managed from the app page.

## Repo layout

```
apps/
  api/      Express control plane (REST + Socket.IO log relay)
  worker/   BullMQ consumer: clone -> buildpacks build -> deploy container
  web/      React (Vite) dashboard
prisma/     Database schema and migrations
packages/
  db/       Prisma 7 client (@prisma/adapter-pg) shared by api and worker
  shared/   Types, LogStorage, socket/queue contracts
  runtime/  ContainerRuntime (dockerode + Traefik labels)
docs/
  SMOKE_TEST.md   End-to-end local verification guide
```

## Prerequisites

- Node.js 20+ and pnpm 9+
- Docker (Docker Desktop locally; Docker Engine on the VPS)
- Docker Desktop (or Docker Engine) on the machine running the worker — buildpacks compile inside containers; no host JDK required
- A GitHub OAuth App (client ID/secret)

## Local development

```bash
pnpm install
cp .env.example .env   # fill in GitHub OAuth credentials, ENCRYPTION_KEY, SESSION_SECRET

# Infra only: Postgres, Redis, Traefik (HTTP on :80 for *.localhost app routes)
pnpm compose:infra

pnpm dev               # runs api, worker, and web on the host in watch mode
```

- Dashboard: http://localhost:5173
- API: http://localhost:3000
- Deployed apps (dev): http://\<app-name\>.localhost
- Traefik dashboard (dev): http://localhost:8080/dashboard/

## Production (single VPS)

Set `BASE_DOMAIN`, `ACME_EMAIL`, GitHub OAuth vars, and secrets in `.env`, then:

```bash
pnpm compose:prod
```

This builds and runs api, worker, and web containers plus Traefik with Let's Encrypt TLS. The dashboard is served at `https://deploy.<BASE_DOMAIN>`.

## Useful scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run api, worker, and web in watch mode |
| `pnpm compose:infra` | Start Postgres, Redis, and Traefik for local dev |
| `pnpm compose:prod` | Build and run the full stack with TLS |
| `pnpm db:migrate` | Create/apply migrations (dev) |
| `pnpm db:migrate:deploy` | Apply migrations (production/CI) |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm typecheck` | Type-check every workspace package |
| `pnpm build` | Build all packages |
| `pnpm test` | Run unit tests across the workspace |
| `pnpm smoke:health` | Check Postgres, Redis, and API `/health` (API must be running) |

## Smoke test

See **[docs/SMOKE_TEST.md](docs/SMOKE_TEST.md)** for a step-by-step end-to-end guide using [spring-petclinic](https://github.com/spring-projects/spring-petclinic).

## Environment variables

See [.env.example](.env.example) for the full annotated list. The important ones:

- `BASE_DOMAIN` — apps are exposed at `<app-name>.<BASE_DOMAIN>` (use `localhost` in dev)
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — GitHub OAuth via Better Auth (any GitHub user)
- `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` — Better Auth session signing and OAuth callback base URL
- `ENCRYPTION_KEY` — 32-byte hex key; encrypts GitHub tokens and app env vars at rest
- `BUILD_CONCURRENCY` — max simultaneous builds (default 2)

## Database (Prisma 7)

Schema lives in [`prisma/schema.prisma`](prisma/schema.prisma); connection URL in [`prisma.config.ts`](prisma.config.ts). The shared client is [`@spring-lane/db`](packages/db) and uses `@prisma/adapter-pg` with the `pg` driver.

```bash
pnpm compose:infra          # start Postgres
pnpm db:migrate             # apply migrations in dev
pnpm db:migrate:deploy      # apply migrations in prod/CI
```

If you already run PostgreSQL locally on port 5432, set `POSTGRES_PORT=5433` in `.env` so Docker Postgres maps to a free port (see `.env.example`).
