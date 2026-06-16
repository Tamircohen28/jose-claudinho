---
name: league-round-utilization
description: League table of played vs upcoming national-team matches this round (all 15 squad players per team).
allowed-tools: [
  "mcp__plugin_jose-claudinho_fantasy-wc__league_round_utilization",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_my_leagues"
]
---

> **Multi-host:** `allowed-tools` enforces access on Claude Code only. On Cursor and Codex,
> the same logical tools appear as `mcp__fantasy-wc__<tool>`.

Use the **league-round-utilization** skill to produce the league utilization table.

Arguments: `$ARGUMENTS` should name the league (e.g. כצים) or give a leagueId, and optionally
the stage or round number. If no league is given, list the user's leagues and ask which one.

Follow the skill procedure and output the Hebrew-formatted utilization table it specifies.

For the **full** league report (utilization + watchlist), use `/league-round-report` instead.
