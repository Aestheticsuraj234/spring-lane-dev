# Code cleanup guidelines

Adapted from our team standards for **Spring Lane** (pnpm monorepo: Express API, BullMQ worker, Vite/React web — not Next.js).

## Purpose

Keep code simple, readable, and maintainable. Solve the actual problem without extra abstractions.

## Cleanup pass order

1. Find dead code (exports with zero imports)
2. Find parallel paths (two routes/handlers for the same job)
3. Remove pass-through wrappers
4. Deduplicate logic (auth checks, helpers, JSX)
5. Simplify React (inline single-use hooks; drop unnecessary `useMemo`/`useCallback`)
6. Verify: `pnpm typecheck && pnpm test && pnpm build`

Useful searches:

```bash
rg "SYMBOL" --glob "*.{ts,tsx}"
rg "^export (async )?function" apps/ packages/ --glob "*.{ts,tsx}"
```

## Rules (summary)

| Do | Don't |
|----|--------|
| Inline one-off logic | Extract a function used once |
| Trust TypeScript types | Runtime-check already-typed values |
| Handle realistic edge cases | Guard every hypothetical failure |
| Share helpers when reused 3+ times | Copy-paste or abstract after one use |
| One API path per UI action | Keep unused "just in case" routes |
| `requireAuth` middleware + ownership queries | Duplicate auth in every handler |

## Spring Lane specifics

- **Auth**: `requireAuth` on routers; `getOwnedApp` / `getOwnedDeployment` for ownership — don't add another layer.
- **Runtime**: `getContainerRuntime()` singleton is OK (dockerode client); don't wrap it again.
- **Logs**: Use `LogStorage` from `@spring-lane/shared/log-storage` directly — no thin getter files.
- **Worker vs API**: Some duplication between apps is fine (e.g. crypto); extract to `packages/` only when a third consumer appears.
- **Express routes**: Keep handlers flat — route → prisma/runtime → response.

## Final rule

**Simple > clever.** Prefer code a intermediate developer can read in a few minutes.

See the full team document for extended examples (Next.js-oriented patterns apply by analogy to Express/React here).
