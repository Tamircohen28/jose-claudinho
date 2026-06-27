# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Multi-host user guide** (`docs/user/multi-host.md`) — running Claude Code, Cursor, and Codex
  on one machine without MCP interference; shared vs isolated `FWC_DATA_DIR`.

### Changed
- Install guides, troubleshooting, README, and `fantasy-setup` skill — link multi-host setup,
  `.env` auto-load, and per-host data-dir examples.

### Security
- **`.gitignore`** — ignore `.env` / `.env.*`; stop tracking committed `.env` (secrets belong
  in environment only).

## [1.4.1] - 2026-06-24

### Fixed
- **`optimize_squad`** — define `__dirname`/`__filename` in the esbuild banner and inline the
  HiGHS `wasm` (`wasmBinary`) so the bundled ESM solver initialises (was
  `ReferenceError: __dirname is not defined` on every call).
- **`get_player_availability`** — drop malformed null-id players in `transform.flattenMarket`
  and `buildAvailabilityMap` (removed ~640 phantom "injured" rows / ~55 KB payload).
- **`compute_squad_ev`** — cap bench EV to the 4 best non-starters so extra transfer
  candidates no longer inflate bench / All-Squad-chip EV; corrected the `five_subs` chip
  rationale (only beneficial during the group stage).
- **`predict_bracket_matchups`** — derive group letters A–L from the official schedule
  (`buildTeamToGroupMap`) so standings split into 12 real groups instead of one `"?"` table.
- **CI** — pin `actions/checkout`@v4 and `actions/setup-node`@v4 (were nonexistent majors
  that failed every run at startup).

### Added
- **Official WC 2026 group-stage schedule** (`wc2026Schedule.ts`) — all 72 MD1–MD3 fixtures
  embedded so `worldcup_fixtures` and round-utilization tools work when TheSportsDB has
  incomplete 2026 data.
- **`worldcup_fixtures` `round` filter** — optional matchday `1` / `2` / `3` for group stage.

### Changed
- `fixtures.ts` — official schedule is the primary source; TheSportsDB enriches live scores.
- `env.ts` — `loadWorkspaceEnv()` reads repo-root `.env` when the host does not inject vars.
- `.cursor/mcp.json` — pass through `API_FOOTBALL_KEY` (aligned with `.mcp.json`).

## [1.4.0] - 2026-06-22

### Added
- **MILP squad optimizer** (`optimize_squad` MCP tool) — jointly solves the optimal 15-player
  squad, starting XI, bench, and captain under all constraints (budget, formation, per-nation
  cap, transfer limit) using the HiGHS WASM MILP solver. Returns the highest-EV legal squad
  and an exact transfer list. Called by the `squad-advice` skill in Step 6 to validate or
  replace the greedy transfer plan.
- **Player-specific EV rates** — `compute_squad_ev` now derives per-player `pPlays`,
  `pPlays60`, and `goalShare` overrides from lineup-confidence data (via `get_lineup_predictions`),
  replacing global position-level constants. Players with high lineup confidence receive
  materially higher EV; rotation risks are discounted.
- **Monte Carlo bracket simulator** — `predict_bracket_matchups` now runs N=500 tournament
  simulations with strength-adjusted KO win probabilities (logistic function clamped 0.20–0.80),
  replacing the flat-50% heuristic. Returns per-team stage probabilities (pGroup, pR32, pR16,
  pQF, pSF, pFinal) and expected rounds remaining.
- **League-win probability overlay** (`compute_league_win` MCP tool) — computes P(beat rival)
  for each rival using a normal approximation (Φ((myEV − rivalEV) / σ_diff)), then derives
  an overall league-win probability and a `strategyMode` (conservative / balanced / aggressive)
  based on current rank and score gap. Used by `squad-advice` in Step 9 to calibrate chip
  and captain decisions.
- `PlayerRateOverrides` interface in `scoring.ts` — formal contract for per-player EV
  parameter overrides; `derivePlayerRates()` helper in `playerMapping.ts` converts lineup
  confidence → rate overrides.

### Changed
- `squad-advice` skill updated to call `optimize_squad` as an MILP shortcut in Step 6,
  and `compute_league_win` in Step 9 for adaptive strategy mode.
- `bracketPredictor.ts` — KO advancement probabilities now strength-adjusted via
  `estimateKoWinProb()`; `simulateTournamentPaths()` exported for external callers.
- `mcp-server/package.json` — added `highs` v1.14.2 (HiGHS WASM MILP solver).

## [1.3.0] - 2026-06-22

### Changed
- **Collapsed the command+skill two-file pattern into single slash-invocable skills.**
  Claude Code now derives a slash command from each `skills/<name>/SKILL.md`, so the
  separate `commands/` layer is redundant. Every command's unique guidance (argument
  parsing, output-format reminders, the multi-host `allowed-tools` footnote) was folded
  into its skill, and the command tool lists are now `allowed-tools` in skill frontmatter.
- Renamed `weekly-squad-advisor` → `squad-advice` and `multi-agent-squad-debate` →
  `squad-debate` so each skill's directory name matches its slash command.
- All merged skills now set `disable-model-invocation: true` and drop the dead
  `user-invocable: false` flag — preserving user-only invocation with no behavior change.

### Added
- `snapshot-league` and `fantasy-setup` skills (previously command-only).

### Removed
- The `commands/` directory and the `"commands": "./commands/"` manifest entries
  (Cursor and Codex). No tool, rule, or MCP behavior changed.

## [1.2.0] - 2026-06-15

### Added
- **Multi-host support** — Cursor (`.cursor-plugin/`) and Codex (`.codex-plugin/`,
  `.agents/plugins/marketplace.json`) manifests alongside Claude Code.
- **`make cursor-plugin`** — symlink local install for Cursor (`~/.cursor/plugins/local/`).
- **`make codex-plugin`** — register Codex marketplace from repo.
- **`.cursor/mcp.json`** — MCP-only fallback when opening the repo in Cursor.
- **`AGENTS.md`** — host-neutral agent guidance.
- Per-host install guides under `docs/user/install/`.
- `skills/shared/references/mcp-tool-names.md` — MCP prefix mapping per host.

### Changed
- All skills v1.2.0 — `disable-model-invocation` for Cursor/Codex; host-agnostic tool wording.
- Commands note Claude-only `allowed-tools`; Cursor/Codex use `mcp__fantasy-wc__*` prefix.

## [1.1.0] - 2026-06-15

### Added
- **Round utilization:** three MCP tools — `team_round_utilization`,
  `league_round_utilization`, `league_watchlist` — join squads, national teams, and
  WC fixtures to report played vs upcoming matches and games of interest.
- Slash commands: `/team-round-utilization`, `/league-round-utilization`,
  `/league-watchlist` with matching internal skills (Hebrew output format).
- **`/league-round-report`** — combined Hebrew league report (utilization + watchlist).
- Shared skill references under `skills/shared/references/` (Hebrew labels, league args,
  error handling, report example).
- `mcp-server/src/nations.ts` — Sport5 nation registry + Hebrew→TheSportsDB aliases.
- `mcp-server/src/roundUtilization.ts` — league-wide squad fetch and watchlist aggregation.
- `sport5_get_league_table` now exposes `roundId` in structured output.

### Changed
- **Zero-config defaults for everything except the cookie.** Fixtures, snapshot
  storage, season and league ids now rely entirely on baked-in server defaults; the
  only env var a user ever sets is `SPORT5_COOKIE`. Optional env vars were removed
  from `.mcp.json` so they no longer need wiring up.
- Expanded all round-utilization skills with full procedures, insights blocks,
  and aligned output contracts.
- `weekly-squad-advisor` — error-handling section and `$ARGUMENTS` parsing.

### Fixed
- Unset or unsubstituted `${VAR}` placeholders (e.g. a literal `"${SPORTSDB_KEY}"`
  arriving from the MCP env config) are now treated as "not set", so defaults always
  win instead of being overridden by a placeholder string. New `src/env.ts` helpers
  (`envOpt`/`envOr`) centralize this and are used across the server.

## [1.0.0] - 2026-06-12

### Added
- Initial release of the **jose-claudinho** Claude Code plugin.
- `fantasy-wc` MCP server (TypeScript, stdio, single-file esbuild bundle) with 10
  tools: `sport5_list_players`, `sport5_get_my_team`, `sport5_get_user_team`,
  `sport5_get_my_leagues`, `sport5_get_league_table`, `worldcup_fixtures`,
  `snapshot_top_teams`, `analyze_ownership`, `list_snapshots`, `get_game_rules`.
- `weekly-squad-advisor` skill encoding the 10-step weekly recommendation
  procedure and a hard constraint-validation checklist.
- Slash commands: `/squad-advice`, `/snapshot-league`, `/fantasy-setup`.
- Official Fantasy WC 2026 rules encoded in `mcp-server/src/rules.ts`
  (per-stage budgets, per-nation caps, transfers, scoring table, bonus chips).
- World Cup fixtures via TheSportsDB (no API key required).
- Local JSON snapshot persistence for week-over-week learning.

### Notes
- Read-and-recommend only; no write/transfer endpoints are used.
- The API `bonusId` → bonus-chip mapping is **verified** against the game config
  (`Leagues/Get → sportTypeBasicConfig.bonusTypes`): 1=TripleCaptain,
  2=ElevenSubs (5 transfers), 3=CaptainAndSubDouble, 4=BenchScore. Team tools now
  label used chips by name.
