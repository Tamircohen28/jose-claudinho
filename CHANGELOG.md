# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.5.0] - 2026-08-03

### Added
- **OpenCode is now a supported target** — four in total: Claude Code, Cursor, Codex,
  OpenCode. `opencode.json` declares `skills.paths`, so all 11 skills load natively
  (confirmed with `opencode debug skill`). OpenCode has no plugin manifest or
  marketplace, so this target is a clone plus config, and its gaps are documented rather
  than papered over.
- **`.claude-plugin/marketplace.json`** — the repo is now its own Claude Code marketplace.
- **`docs/user/install/opencode.md`** and **`docs/user/install/README.md`** — a per-target
  install index with the version matrix, a component-coverage table, and the manifest
  paths for each target.

### Fixed
- **Standalone Claude Code install was broken.** `claude plugin marketplace add <repo>`
  failed with `Marketplace file not found at .../.claude-plugin/marketplace.json` — the
  file did not exist. That also broke `make plugin`, which runs the same command against
  the repo root, so the documented local-development path could never have worked either.
  Verified fixed end to end with the 2.1.220 CLI.
- **Platform version floors were stale or wrong.** Cursor was pinned at `0.45.0`, which
  predates Cursor's plugin system entirely; Claude Code and Codex were both recorded as
  validated against their own minimums. Every target now records `validated_against`,
  `verified_on`, and a `verification_method`, checked against a locally installed CLI.

### Changed
- `platform-targets.json` moves to `schema_version` 2 with a `supported_targets` array,
  per-target `capabilities`, `supported_min_source`, and an OpenCode `capability_gaps`
  block. `scripts/check-platform-targets.sh` now reads the target list from that array
  instead of a hardcoded three, so adding a target automatically extends the gate.
- Manifests bumped to 1.5.0 (`.claude-plugin`, `.cursor-plugin`, `.codex-plugin`, and the
  Codex marketplace entry).
- README badges updated to the validated versions; Quick Start now covers all four
  targets and shows the no-clone install path for Claude Code, Cursor, and Codex.
- `docs/user/install/{claude-code,cursor,codex}.md` each gained a version header, the
  marketplace-manifest path for that target, and a troubleshooting table. The Codex guide
  now leads with the fact that Codex resolves `.agents/plugins/marketplace.json`, not
  `.codex-plugin/marketplace.json`.
- **Platform parity pass** (previously unreleased) — `platform-targets.json`,
  `platform-equivalence.md`, `.codex/config.toml` stub, feature-equivalence +
  platform-targets CI scripts, Makefile `update`/`uninstall`/`repo-standards-gate`,
  README version badges.
- **`.claude-plugin/plugin.json`** — aligned `skills` and `mcpServers` with cursor/codex manifests.

## [1.4.2] - 2026-07-02

### Added
- **Repo standards pass** — canonical `docs/CHANGELOG.md` pointer, `docs/reference/` for
  the game-rules docs, and an `agent:check` validate script (`typecheck` + `build`) in
  `mcp-server/package.json`.
- **Knockout fixtures** — embedded R32→final schedule (`wc2026KnockoutSchedule.ts`);
  `worldcup_fixtures` gains `stage` filter (default `knockout` for `when=next`).
- **Multi-host user guide** (`docs/user/multi-host.md`) — running Claude Code, Cursor, and Codex
  on one machine without MCP interference; shared vs isolated `FWC_DATA_DIR`.

### Changed
- **`.env` policy** — repo-root `.env` is the tracked credential store (committed in this
  repo). Agent docs (`CLAUDE.md`, `AGENTS.md`, `fantasy-setup`, `CONTRIBUTING`) updated;
  CI secret scan excludes `.env`.
- Install guides, troubleshooting, README, and `fantasy-setup` skill — link multi-host setup,
  `.env` auto-load, and per-host data-dir examples.

### Fixed
- **`sport5_get_my_team`** — clearer error when Sport5 returns no `userTeam` (stale cookie).
- **`worldcup_fixtures`** — completed games reported as "Not Started", corrupting standings,
  P(advance), and the R32 bracket. Backfilled 21 verified results (3 MD2 + 18 MD3) into the
  embedded schedule (`wc2026Schedule.ts`); the 6 still-unplayed MD3 deciders stay null.
- **`worldcup_fixtures`** — score merge required an exact date match, so TheSportsDB results
  were dropped whenever the two sources disagreed by ±1 day. Now matches on the (unique)
  team pair and never overwrites a cached result with a null live score.
- **`worldcup_fixtures`** — harvest per-round endpoints (`eventsround` r=1–7), widening live
  coverage from 7 to 17 events on the free key; played-detection now falls back to end of the
  match day when a fixture carries no kickoff time.

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
- **`provide-wc-plan` skill** — full-season roadmap covering every transfer window, chip
  calendar (correct early-deployment strategy), captaincy by stage, formation advice, and
  penalty-taker targeting through the Final.
- **`get_penalty_takers` MCP tool** — static registry of known WC 2026 penalty takers per
  nation (21 nations covered, primary + backup player IDs).

### Changed
- `squad-advice` skill updated to call `optimize_squad` as an MILP shortcut in Step 6,
  and `compute_league_win` in Step 9 for adaptive strategy mode.
- `bracketPredictor.ts` — KO advancement probabilities now strength-adjusted via
  `estimateKoWinProb()`; `simulateTournamentPaths()` exported for external callers.
- `mcp-server/package.json` — added `highs` v1.14.2 (HiGHS WASM MILP solver).
- `scripts/league-matchups.py` — refactored to WhatsApp-formatted output (bold/italic
  markers, one line per player across owning teams, `[B]`/`[C1]`/`[C2]` bench/captain
  tags) with `.txt` file export.

### Fixed
- **`worldcup_fixtures`** — `when=all` queries returning fewer than 10 results now
  combine the past+next endpoints to supplement the incomplete season endpoint (was
  returning only 5 fixtures for full-season queries).

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
- **EV/rules engine** — `scoring.ts`: probabilistic EV engine (per-fixture expected points
  for goals/assists/CS/cards/penalties, squad EV aggregation, transfer evaluator, chip
  timing heuristics, deterministic `computeExactScore()`); `bracketPredictor.ts`: group
  standings from fixture results, P(advance) per team, R32 matchup predictions via FIFA
  bracket seeding with head-to-head tiebreaking; `docs/rules-he.md`/`docs/rules-en.md`
  canonical rules docs (now under `docs/reference/`).
- Three new MCP tools: `compute_squad_ev` (EV breakdown per player + chip advice),
  `predict_bracket_matchups` (group standings → R32 predictions), `rank_transfer_candidates`
  (feasible swaps ranked by EV gain).
- **`transfer-optimizer` skill** — 12-step transfer optimizer with mathematical foundation
  and output format; transfer-window-closed detection; fixture-difficulty tiering.
- **`multi-agent-squad-debate` skill** (renamed `squad-debate` this release) — 5-phase
  debate (Conservative / Aggressive / Value agents → debate → synthesis verdict).
- **`league-next24h-matchups` skill** — WC matches kicking off in the next 24h (Israel
  time) with per-game breakdown of which league teams own players on each side.
- **Real-time availability integration** — `get_player_availability` (API-Football, 6h
  cache) and `get_lineup_predictions` (FotMob/RotoWire/365scores consensus, 2h cache)
  MCP tools; `compute_squad_ev` applies injured/suspended (EV=0), doubtful (EV×0.4), and
  predicted-non-starter (bench) overrides from live data.
- `scripts/league-matchups.py` — standalone daily WC match ownership report (per-match
  breakdown of which league squads own players on each side), ESPN fixture source.
- Richer competitive intelligence in `league-round-utilization` (round phase
  classification, pacing bands, opportunity/risk flags, personalised narrative),
  `team-round-utilization`, and `league-watchlist` (tiered 🔥/⭐ interest classification,
  captain radar callout).
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
