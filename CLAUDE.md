# CLAUDE.md — José Claudinho

Guidance for Claude Code sessions working in this repo.

## Project overview

José Claudinho is a **Claude Code plugin** that helps a user manage their team in
**Sport5 Fantasy World Cup 2026**. It bundles an MCP server (`fantasy-wc`), a skill
(`weekly-squad-advisor`) and three slash commands. It reads the player market, the
user's team, rival top teams, league tables and World Cup fixtures; snapshots the
best teams each round into local JSON; and recommends transfers, captain and lineup
under the official game rules. It is **read-and-recommend only** — it never mutates
the user's team.

## Key file locations

| Path | Purpose |
|------|---------|
| `.claude-plugin/plugin.json` | Plugin manifest (name, version, author) |
| `.claude-plugin/marketplace.json` | Local marketplace entry for `/plugin install` |
| `.mcp.json` | MCP server registration (`fantasy-wc`, env passthrough) |
| `mcp-server/src/index.ts` | Registers all 10 MCP tools (Zod schemas + handlers) |
| `mcp-server/src/rules.ts` | **Authoritative** encoded game rules (budgets, caps, scoring, chips) |
| `mcp-server/src/sport5Client.ts` | Authenticated Sport5 API client + cookie guards |
| `mcp-server/src/transform.ts` | Raw API → slim DTO transforms |
| `mcp-server/src/analysis.ts` | `buildSnapshot()` + `analyzeOwnership()` |
| `mcp-server/src/storage.ts` | Local JSON snapshot read/write |
| `mcp-server/src/fixtures.ts` | World Cup fixtures via TheSportsDB |
| `mcp-server/dist/index.js` | **Committed** single-file esbuild bundle (the runtime artifact) |
| `skills/weekly-squad-advisor/SKILL.md` | The 10-step weekly recommendation procedure |
| `commands/` | `/squad-advice`, `/snapshot-league`, `/fantasy-setup` |

## Build & test commands

```bash
cd mcp-server
npm install          # uses the local .npmrc pinning registry.npmjs.org
npm run typecheck    # tsc --noEmit  — the primary correctness gate
npm run build        # esbuild → dist/index.js  (commit the result)
```

There is no unit-test suite yet; **`npm run typecheck` is the gate**. Always rebuild
`dist/index.js` after changing anything under `mcp-server/src/` and commit the bundle.

## Commit message convention

Short imperative subject (≤ 72 chars), optional body explaining *why*. Example:
`Add cookie guard to league-table tool`.

## Hard constraints — never change these

- **Read-and-recommend only.** Never add write/transfer/mutation calls to the Sport5
  API. The plugin must never change the user's team.
- **No credentials in the repo.** `SPORT5_COOKIE` is supplied via environment only.
  Never commit a cookie, token or the user's session.
- **Rules live in `rules.ts`.** Don't scatter game-rule constants across files; update
  the single source of truth.
- **Public npm registry.** Keep `mcp-server/.npmrc` pinned to `registry.npmjs.org`.
- **Personal GitHub only** — `TamirCohen28`. No Wix accounts, registries or references.
- **Sport5 T&C / FAQ docs are not published.** They're gitignored local reference only.
