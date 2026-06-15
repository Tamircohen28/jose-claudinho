# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **`/league-round-report`** — combined Hebrew league report (utilization + watchlist).
- Shared skill references under `skills/shared/references/` (Hebrew labels, league args,
  error handling, report example).

### Changed
- Expanded all round-utilization skills to v1.1.0 with full procedures, insights blocks,
  and aligned output contracts.
- `weekly-squad-advisor` v1.1.0 — error-handling section and `$ARGUMENTS` parsing.

## [1.1.0] - 2026-06-15

### Added
- **Round utilization:** three MCP tools — `team_round_utilization`,
  `league_round_utilization`, `league_watchlist` — join squads, national teams, and
  WC fixtures to report played vs upcoming matches and games of interest.
- Slash commands: `/team-round-utilization`, `/league-round-utilization`,
  `/league-watchlist` with matching internal skills (Hebrew output format).
- `mcp-server/src/nations.ts` — Sport5 nation registry + Hebrew→TheSportsDB aliases.
- `mcp-server/src/roundUtilization.ts` — league-wide squad fetch and watchlist aggregation.
- `sport5_get_league_table` now exposes `roundId` in structured output.

### Changed
- **Zero-config defaults for everything except the cookie.** Fixtures, snapshot
  storage, season and league ids now rely entirely on baked-in server defaults; the
  only env var a user ever sets is `SPORT5_COOKIE`. Optional env vars were removed
  from `.mcp.json` so they no longer need wiring up.

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
