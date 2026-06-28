# CLAUDE.md — José Claudinho

Guidance for Claude Code sessions working in this repo.

## Project overview

José Claudinho is a **multi-host plugin** (Claude Code, Cursor, Codex) that helps a user manage their team in
**Sport5 Fantasy World Cup 2026**. It bundles an MCP server (`fantasy-wc`), skills
and slash commands. It reads the player market, the user's team, rival top teams,
league tables and World Cup fixtures; snapshots the best teams each round into local
JSON; recommends transfers, captain and lineup under the official game rules; and
reports round utilization (played vs upcoming) and league watchlists. It is
**read-and-recommend only** — it never mutates the user's team.

## Key file locations

| Path | Purpose |
|------|---------|
| `.claude-plugin/plugin.json` | Claude Code plugin manifest |
| `.cursor-plugin/plugin.json` | Cursor plugin manifest |
| `.codex-plugin/plugin.json` | Codex plugin manifest |
| `.agents/plugins/marketplace.json` | Codex marketplace catalog |
| `AGENTS.md` | Host-neutral agent guidance |
| `.mcp.json` | MCP server registration (`fantasy-wc`, env passthrough) |
| `.env` | **Tracked** Sport5 session cookie + optional MCP vars (`SPORT5_COOKIE`, etc.) |
| `mcp-server/src/index.ts` | Registers all 13 MCP tools (Zod schemas + handlers) |
| `mcp-server/src/rules.ts` | **Authoritative** encoded game rules (budgets, caps, scoring, chips) |
| `mcp-server/src/sport5Client.ts` | Authenticated Sport5 API client + cookie guards |
| `mcp-server/src/transform.ts` | Raw API → slim DTO transforms |
| `mcp-server/src/analysis.ts` | `buildSnapshot()` + `analyzeOwnership()` |
| `mcp-server/src/nations.ts` | National team registry + Hebrew→TheSportsDB aliases |
| `mcp-server/src/roundUtilization.ts` | Round utilization + league watchlist logic |
| `mcp-server/src/storage.ts` | Local JSON snapshot read/write |
| `mcp-server/src/fixtures.ts` | World Cup fixtures via TheSportsDB |
| `mcp-server/dist/index.js` | **Committed** single-file esbuild bundle (the runtime artifact) |
| `skills/squad-advice/SKILL.md` | The 10-step weekly recommendation procedure (`/squad-advice`) |
| `skills/squad-debate/SKILL.md` | Multi-agent strategy debate + synthesis (`/squad-debate`) |
| `skills/transfer-optimizer/SKILL.md` | EV-grounded transfer & lineup optimizer (`/transfer-optimizer`) |
| `skills/snapshot-league/SKILL.md` | Capture top teams + market snapshot (`/snapshot-league`) |
| `skills/fantasy-setup/SKILL.md` | Configure & verify the Sport5 cookie (`/fantasy-setup`) |
| `skills/team-round-utilization/SKILL.md` | Per-team round player status |
| `skills/league-round-utilization/SKILL.md` | League played vs upcoming table |
| `skills/league-watchlist/SKILL.md` | League games-of-interest watchlist |
| `skills/league-round-report/SKILL.md` | Combined league utilization + watchlist report |
| `skills/league-next24h-matchups/SKILL.md` | WC matches in the next 24h with league ownership |
| `skills/shared/references/` | Shared Hebrew labels, args, errors, report example |

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
- **Credentials in `.env` only.** `SPORT5_COOKIE` and other secrets belong in the
  repo-root `.env` file, which is **tracked and committed** in this repo. Do not scatter
  cookies or tokens into source, manifests, skills, or docs. When the Sport5 session
  expires, update `.env` and commit the change.
- **Rules live in `rules.ts`.** Don't scatter game-rule constants across files; update
  the single source of truth.
- **Public npm registry.** Keep `mcp-server/.npmrc` pinned to `registry.npmjs.org`.
- **Personal GitHub only** — `TamirCohen28`. No Wix accounts, registries or references.
- **Sport5 T&C / FAQ docs are not published.** They're gitignored local reference only.
