---
name: squad-advice
description: Get this round's Fantasy World Cup transfer, captain and lineup recommendations.
allowed-tools: [
  "mcp__plugin_jose-claudinho_fantasy-wc__get_game_rules",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_my_team",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_user_team",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_list_players",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_league_table",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_my_leagues",
  "mcp__plugin_jose-claudinho_fantasy-wc__worldcup_fixtures",
  "mcp__plugin_jose-claudinho_fantasy-wc__snapshot_top_teams",
  "mcp__plugin_jose-claudinho_fantasy-wc__analyze_ownership",
  "mcp__plugin_jose-claudinho_fantasy-wc__list_snapshots"
]
---

> **Multi-host:** `allowed-tools` enforces access on Claude Code only. On Cursor and Codex,
> the same logical tools appear as `mcp__fantasy-wc__<tool>` (see `skills/shared/references/mcp-tool-names.md`).

Use the **weekly-squad-advisor** skill to produce this round's recommendation.

Arguments (optional): `$ARGUMENTS` may name the tournament stage
(group / r32 / r16 / qf / sf / final) and/or the goal ("climb overall" vs
"defend my private league"). If the stage isn't given, infer it from
`worldcup_fixtures` and confirm with the user.

Follow the skill's 10-step weekly procedure: establish the stage and rules, load
my team, check availability and eliminations, pull fixtures, refresh the
top-teams snapshot + ownership analysis, draft legal transfers, choose
captain/vice, set a legal lineup and bench, weigh chips, and **validate against
the full constraint checklist before presenting**. Output the tight plan format
the skill specifies. Recommendations only — I apply the moves in the app.
