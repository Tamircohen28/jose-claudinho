---
name: league-round-report
description: Full private-league round report — utilization table + games of interest + summary (Hebrew).
allowed-tools: [
  "mcp__plugin_jose-claudinho_fantasy-wc__league_round_utilization",
  "mcp__plugin_jose-claudinho_fantasy-wc__league_watchlist",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_my_leagues"
]
---

Use the **league-round-report** skill to produce the full combined league round analysis.

Arguments: `$ARGUMENTS` should name the league (e.g. כצים) or give a leagueId, and optionally
the stage or round number. If no league is given, list the user's leagues and ask which one.

This is the **recommended** command for private-league round tracking — it combines
`/league-round-utilization` and `/league-watchlist` in one Hebrew report.

Follow the skill procedure and output format in `skills/shared/references/league-report-example.md`.
