---
name: league-next24h-matchups
description: World Cup matches in the next 24 hours (Israel time) with הכצים league player ownership per game.
allowed-tools: [
  "Bash",
  "mcp__plugin_jose-claudinho_fantasy-wc__worldcup_fixtures",
  "mcp__plugin_jose-claudinho_fantasy-wc__league_watchlist",
  "mcp__plugin_jose-claudinho_fantasy-wc__league_round_utilization",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_my_leagues"
]
---

> **Multi-host:** `allowed-tools` enforces access on Claude Code only. On Cursor and Codex,
> the same logical tools appear as `mcp__fantasy-wc__<tool>`.

Use the **league-next24h-matchups** skill to list every World Cup match kicking off
in the next 24 hours and show which הכצים fantasy teams own players on each side.

Arguments: optionally name a different league (default: הכצים / id 36127).

Follow the skill procedure exactly. Output **only** the formatted match list —
no headers, no summaries, no extra text.
