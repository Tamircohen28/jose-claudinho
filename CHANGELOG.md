# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

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
- The API `bonusId` → bonus-chip mapping is inferred and not yet verified.
