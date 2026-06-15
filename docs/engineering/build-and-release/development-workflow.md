# Development Workflow

## Setup

```bash
git clone https://github.com/TamirCohen28/jose-claudinho
cd jose-claudinho/mcp-server
npm install      # uses the pinned public npm registry (.npmrc)
```

## The edit loop

1. Change code under `mcp-server/src/`.
2. Type-check — **this is the gate**:
   ```bash
   npm run typecheck      # tsc --noEmit
   ```
3. Rebuild the runtime bundle:
   ```bash
   npm run build          # esbuild → dist/index.js
   ```
4. **Commit the rebuilt `dist/index.js`.** It's the committed runtime artifact; the
   plugin loads it directly, so a stale bundle ships stale behavior.

Or from the repo root, via the Makefile:

```bash
make typecheck
make build
```

## Testing a change live

Re-build, then in an interactive `claude` session reinstall the local plugin (or
restart Claude Code so the MCP server reloads). For cookie-gated tools, export
`SPORT5_COOKIE` first — see the [quick start](../../user/quick-start.md).

There is no unit-test suite yet. If you add one, wire it into `npm test` and the CI
workflow.

## Adding a new MCP tool

1. Add the handler in `src/index.ts` with a Zod input schema and an
   `annotations` block; return `structuredContent`.
2. If it returns Sport5 data, add a transform in `transform.ts` that emits a slim DTO
   — don't pass raw payloads through.
3. If it hits a cookie-gated endpoint, call `requireCookie()` at the top.
4. Update the README tool list, `docs/engineering/architecture/overview.md`,
   `CLAUDE.md`, and the `CHANGELOG.md`.

## Changing game rules

Edit **only** `src/rules.ts` (the single source of truth), rebuild, and update
`skills/weekly-squad-advisor/references/scoring-and-constraints.md` to match.

## Release

See [ci-workflow.md](ci-workflow.md) for what CI enforces, and the
[release workflow](../../../.github/workflows/release.yml) for cutting a tagged release.
