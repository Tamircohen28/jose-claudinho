---
name: league-watchlist
description: Games of interest — upcoming round fixtures where league players are involved, by fantasy team.
allowed-tools: [
  "mcp__plugin_jose-claudinho_fantasy-wc__league_watchlist",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_my_leagues"
]
---

Use the **league-watchlist** skill to produce the games-of-interest watchlist for a league.

Arguments: `$ARGUMENTS` should name the league (e.g. כצים) or give a leagueId, and optionally
the stage or round number. If no league is given, list the user's leagues and ask which one.

Follow the skill procedure and output the Hebrew-formatted watchlist it specifies.
