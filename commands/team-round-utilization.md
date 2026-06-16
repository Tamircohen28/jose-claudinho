---
name: team-round-utilization
description: Show per-player round status for one fantasy team — national-team fixture, played/upcoming, round points.
allowed-tools: [
  "mcp__plugin_jose-claudinho_fantasy-wc__team_round_utilization",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_my_leagues",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_league_table",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_my_team",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_user_team"
]
---

> **Multi-host:** `allowed-tools` enforces access on Claude Code only. On Cursor and Codex,
> the same logical tools appear as `mcp__fantasy-wc__<tool>`.

Use the **team-round-utilization** skill to analyze one fantasy team's round utilization.

Arguments (optional): `$ARGUMENTS` may be a team name (with league context), a userId,
league name/id, or stage (group / r32 / r16 / qf / sf / final). Default: your connected team.

Follow the skill procedure and output the Hebrew-formatted player table it specifies.
