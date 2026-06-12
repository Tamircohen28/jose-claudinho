# Architecture Overview

## What the system is

José Claudinho is a Claude Code **plugin** wrapping a **stdio MCP server**. The server
is the engine; the plugin layer wires it into Claude Code and adds a reasoning skill.
Everything is read-only with respect to the game — the system fetches, transforms,
stores and analyzes data, then hands a plan to the user.

## Components

```
┌─────────────────────────── Claude Code ───────────────────────────┐
│                                                                    │
│  commands/                     skills/weekly-squad-advisor/        │
│  ├─ /squad-advice    ─────────▶  10-step procedure +              │
│  ├─ /snapshot-league            constraint-validation checklist    │
│  └─ /fantasy-setup                        │                        │
│                                           │ calls MCP tools        │
│                                           ▼                        │
│                          .mcp.json → fantasy-wc server (stdio)     │
└───────────────────────────────────────────┼──────────────────────┘
                                             │
        ┌────────────────────────────────────┼────────────────────────────┐
        │            mcp-server (dist/index.js, esbuild bundle)            │
        │                                    │                             │
        │  index.ts  ── registers 10 tools (Zod in, structuredContent out) │
        │     │                                                            │
        │     ├─ rules.ts        get_game_rules                            │
        │     ├─ sport5Client.ts s5get(), requireCookie(), pool()         │
        │     ├─ transform.ts    slimPlayer/flattenMarket/summarizeTeam    │
        │     ├─ analysis.ts     buildSnapshot(), analyzeOwnership()       │
        │     ├─ storage.ts      writeSnapshot/listSnapshots/readSnapshot  │
        │     └─ fixtures.ts     getFixtures()                             │
        └─────────┬───────────────────┬────────────────────┬─────────────┘
                  │                   │                    │
                  ▼                   ▼                    ▼
        Sport5 API              TheSportsDB         ~/.fantasy-wc-mcp/data/
   dreamteam.sport5.co.il      (public fixtures)     (local JSON snapshots)
   (cookie-gated reads)
```

## Data flow — a `/squad-advice` request

1. The skill calls `get_game_rules(stage)` → budget, per-nation cap, transfer count
   for the current stage, straight from `rules.ts`.
2. `sport5_get_my_team` → the user's XI, bench, captain, budget, transfers left
   (cookie-gated; `summarizeTeam()` structures the raw payload).
3. `worldcup_fixtures` → who plays this round and who's eliminated (TheSportsDB).
4. `snapshot_top_teams` → `buildSnapshot()` pulls the top-N league table, each rival
   squad (via the bounded `pool()`), and the full market, writing one timestamped JSON
   via `storage.ts`. `analyze_ownership` then turns the snapshot history into
   ownership %, captaincy %, points-per-million and differentials.
5. `sport5_list_players` → value and alternatives from the flattened market.
6. The skill drafts a plan and runs it through the constraint checklist before
   presenting it.

## Key design choices

- **Slim DTOs, not raw payloads.** Every tool returns `structuredContent` shaped for
  an agent (`priceM`, `position` label, `pointsPerMillion`, `available`) rather than
  the verbose Sport5 JSON. Transforms live in `transform.ts`.
- **Rules as a single source of truth.** All budgets, caps, the scoring table and the
  bonus-chip mapping live in `rules.ts`. The `bonusId → chip` mapping is *verified*
  against the game's own config endpoint, not guessed.
- **Cookie guards at the tool boundary.** Cookie-gated tools call `requireCookie()` so
  a missing/expired session fails with an actionable message instead of an opaque 302.
- **Bounded concurrency.** Snapshotting many rival squads uses `pool()` to cap
  parallel requests and stay polite to the API.
- **Committed single-file bundle.** esbuild produces `dist/index.js`; see
  [ADR-001](../decisions/001-esbuild-single-file-bundle.md).

## What it deliberately does not do

No write/transfer/mutation calls to Sport5. No storage of credentials. No network
calls beyond Sport5's API and TheSportsDB.
