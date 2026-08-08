# End-to-end smoke test

This guide walks through a full local deploy using a public Spring Boot sample repo.

## Sample repository

Use **[spring-projects/spring-petclinic](https://github.com/spring-projects/spring-petclinic)** (Maven + `./mvnw spring-boot:build-image`) or any Spring Boot 3 repo with the build-image goal enabled.

| Repo | Build tool | Notes |
|------|------------|-------|
| [spring-projects/spring-petclinic](https://github.com/spring-projects/spring-petclinic) | Maven | Well-known demo; first build takes several minutes |
| [spring-guides/gs-spring-boot](https://github.com/spring-guides/gs-spring-boot) | Maven/Gradle | Minimal guide project |

## Prerequisites

1. **Docker Desktop** running (daemon + `spring-lane` network will be created by Compose).
2. **JDK 17+** on the host running the worker (`java -version`).
3. **Git** on PATH.
4. **GitHub OAuth App** with:
   - Homepage URL: `http://localhost:5173`
   - Callback URL: `http://localhost:3000/api/auth/callback/github`
   - Scopes: user profile + repo (via Better Auth GitHub provider)
5. **Secrets in `.env`**:
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
   - `BETTER_AUTH_SECRET` (32+ chars)
   - `ENCRYPTION_KEY` — **64 hex characters** (32 bytes). Generate:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
6. If port **5432** is taken locally, set `POSTGRES_PORT=5433` in `.env` and use:
   ```env
   DATABASE_URL=postgresql://springlane:springlane@localhost:5433/springlane
   ```
   Then recreate Postgres: `POSTGRES_PORT=5433 pnpm compose:infra`

## 1. Boot infrastructure

```bash
pnpm install
pnpm compose:infra          # Postgres, Redis, Traefik (*.localhost)
pnpm db:migrate:deploy      # apply Prisma migrations
```

Verify containers:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
```

Traefik dashboard: http://localhost:8080/dashboard/

## 2. Start application services

In one terminal:

```bash
pnpm dev                    # api :3000, worker, web :5173
```

Or separately:

```bash
pnpm dev:api
pnpm dev:worker
pnpm dev:web
```

## 3. Automated health checks

With the API running:

```bash
pnpm smoke:health
```

Expected output:

```
[ok] postgres
[ok] redis
[ok] api /health
3/3 checks passed
```

## 4. Unit tests

```bash
pnpm test
```

Covers Traefik label generation, log storage, API mappers, and worker build helpers.

## 5. Manual dashboard flow

1. Open **http://localhost:5173**
2. **Sign in with GitHub**
3. Click **New app**
4. Select `spring-projects/spring-petclinic` (or your fork)
5. Branch: `main`
6. App name: e.g. `petclinic` → URL will be **http://petclinic.localhost**
7. Click **Create app**, then **Deploy**

### What to expect

| Phase | Status | Where to watch |
|-------|--------|----------------|
| Queued | `QUEUED` | App detail → Build logs (live) |
| Clone + build | `BUILDING` | Log stream via Socket.IO |
| Container start | `DEPLOYING` | Worker logs |
| Ready | `LIVE` | Badge turns green; URL link appears |

First buildpack build can take **5–15 minutes** depending on network and CPU.

### Verify the deployed app

```bash
curl -s -o /dev/null -w "%{http_code}" http://petclinic.localhost
```

Expect `200` once the container is healthy.

Browser: **http://petclinic.localhost**

## 6. Lifecycle checks

From the app detail page:

- **Restart** — container restarts, status stays `LIVE`
- **Stop** — status → `STOPPED`, URL stops responding
- **Deploy** again — new deployment, old container swapped out
- **Container logs** tab — stdout/stderr from the running container

## 7. API smoke (optional, with session cookie)

After logging in via the browser, use DevTools → Application → Cookies and copy the session cookie, or use the dashboard exclusively.

Authenticated endpoints (via Vite proxy):

```bash
# List apps (requires session cookie from browser login)
curl -b "better-auth.session_token=..." http://localhost:5173/api/apps
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `password authentication failed` | Postgres port conflict — use `POSTGRES_PORT=5433` |
| `ENCRYPTION_KEY must be a 32-byte hex string` | Key must be **64** hex chars |
| GitHub OAuth redirect error | Callback must be `http://localhost:3000/api/auth/callback/github` |
| Build fails immediately | Ensure Docker daemon is running; worker needs Docker for `bootBuildImage` |
| `petclinic.localhost` unreachable | Traefik must be up (`pnpm compose:infra`); container on `spring-lane` network |
| Live logs empty | Confirm Redis is running; check API logs for `[socket] log relay ready` |

## Cleanup

```bash
# Stop app processes (Ctrl+C in dev terminal)
pnpm compose:infra:down

# Remove deployed app containers (optional)
docker ps --filter label=spring-lane.app -q | xargs -r docker rm -f
```
