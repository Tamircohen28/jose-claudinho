---
name: snapshot-league
description: Capture the current top-N teams + market into a local snapshot for week-over-week learning.
allowed-tools: [
  "mcp__plugin_jose-claudinho_fantasy-wc__snapshot_top_teams",
  "mcp__plugin_jose-claudinho_fantasy-wc__list_snapshots",
  "mcp__plugin_jose-claudinho_fantasy-wc__analyze_ownership"
]
---

> **Multi-host:** `allowed-tools` enforces access on Claude Code only. On Cursor and Codex,
> the same logical tools appear as `mcp__fantasy-wc__<tool>`.

Capture this round's learning data.

1. Run `snapshot_top_teams` (default topN 50, overall league unless `$ARGUMENTS`
   specifies a leagueId or a different topN). This saves a timestamped JSON
   snapshot of the top teams' squads, captains and the full market.
2. Run `analyze_ownership` on the new snapshot and give me a short readout:
   most-owned players, the popular captain, best points-per-million picks, and the
   notable differentials (high points, low ownership).
3. Confirm the snapshot file was written (`list_snapshots`).

This builds the history the advisor learns from each week.
