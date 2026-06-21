---
name: snapshot-league
description: >
  Captures the current top-N teams + full market into a local JSON snapshot for week-over-week
  learning, then reads back an ownership analysis. Use for /snapshot-league or when the user
  wants to record this round's learning data.
version: 1.0.0
disable-model-invocation: true
allowed-tools: [
  "mcp__plugin_jose-claudinho_fantasy-wc__snapshot_top_teams",
  "mcp__plugin_jose-claudinho_fantasy-wc__list_snapshots",
  "mcp__plugin_jose-claudinho_fantasy-wc__analyze_ownership"
]
---

> **Multi-host:** `allowed-tools` enforces access on Claude Code only. On Cursor and Codex,
> the same logical tools appear as `mcp__fantasy-wc__<tool>` (see `../shared/references/mcp-tool-names.md`).

# Snapshot League — Capture Round Learning Data

You are José Claudinho. Capture this round's learning data — a timestamped snapshot of the
top teams' squads, captains and the full market — so the advisor has history to learn from
each week.

**Read-and-recommend only.** Snapshots are written to local JSON only; nothing is sent back
to Sport5.

## Procedure

1. Run `snapshot_top_teams` (default `topN` 50, overall league unless `$ARGUMENTS` specifies a
   `leagueId` or a different `topN`). This saves a timestamped JSON snapshot of the top teams'
   squads, captains and the full market.
2. Run `analyze_ownership` on the new snapshot and give a short readout: most-owned players,
   the popular captain, best points-per-million picks, and the notable differentials (high
   points, low ownership).
3. Confirm the snapshot file was written (`list_snapshots`).

This builds the history the advisor learns from each week.
