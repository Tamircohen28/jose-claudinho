---
name: team-round-utilization
description: >
  Maps one fantasy team's 15 players to national-team fixtures — played/upcoming, round
  points, XI/bench. Use for /team-round-utilization or when the user asks who played
  this round on their squad. Hebrew output, Israel UTC+3.
version: 1.2.0
user-invocable: false
disable-model-invocation: true
---

# Team Round Utilization

You are José Claudinho. Show how each of the **15 squad players** maps to their national
team's match in the current fantasy round — with sorting, flags, and mid-round context.

## Tools

`fantasy-wc` MCP tools (see `../shared/references/mcp-tool-names.md` for host prefixes):

- `team_round_utilization` — primary data
- `sport5_get_my_leagues` — resolve `leagueId` from name
- `sport5_get_league_table` — list teams when name lookup fails (per `league-args.md`)
- `sport5_get_my_team` or `sport5_get_user_team` — optional, for captain (C) / vice (VC) markers

Read-and-recommend only. Never mutate the user's team.

## References

- `../shared/references/hebrew-labels.md` — stage labels, status emojis, match formatting
- `../shared/references/mcp-tool-names.md` — host-specific MCP prefixes
- `../shared/references/league-args.md` — parse `$ARGUMENTS`
- `../shared/references/error-handling.md` — cookie, not found, fixture mismatch

## Procedure

Follow in order. Do not skip error handling.

1. **Parse arguments** per `league-args.md`: `userId`, `teamName`, `leagueName`/`leagueId`,
   optional `roundId`, `stage` (default `group`).

2. **Resolve league** when `teamName` or `leagueName` is given but not `leagueId`:
   call `sport5_get_my_leagues`; disambiguate if needed.

3. **Fetch utilization** — call `team_round_utilization` with resolved params
   (default: connected user's team).

4. **Optional captain markers** — if analyzing your team or a known `userId`, call
   `sport5_get_my_team` or `sport5_get_user_team` and mark `(C)` / `(VC)` on matching rows.

5. **Map stage label** — use Hebrew from `hebrew-labels.md` for the header (not hardcoded
   שלב הבתים unless `stage=group`).

6. **Sort rows** for readability:
   - Starters before bench (`isStarter` true first).
   - Within each group: unplayed before played (upcoming matches matter more mid-round).
   - Then by kickoff time ascending (`fixture.date`, `fixture.timeIsrael`).

7. **Build the table** — one row per player. Use `nationFlag`, `nationNameHe`, `position`
   (Hebrew labels from reference). Match cell: `{flag} {nationNameHe} נגד {opponent}` or
   `{homeTeam} vs {awayTeam}` if opponent missing.

8. **Sanity check** — `summary.played + summary.upcoming === summary.total` (expect 15 or
   fewer if squad incomplete). If mismatch, note it.

9. **Mid-round callout** — if `summary.upcoming > 0`, add after the summary line:
   - Count still waiting.
   - **Next kickoff:** earliest upcoming fixture among unplayed players (date + time Israel).

10. **Anomalies footnote** — if any player has `fixture: null` or `played` with null
    `roundPoints`, explain per `error-handling.md` (alias mismatch / Sport5 lag).

## Output format

```markdown
# {teamName} — ניצול סיבוב {roundId} ({stageLabelHe})

| שחקן | עמדה | נבחרת | XI/ספסל | משחק | סטטוס | נק׳ סיבוב |
|------|------|-------|---------|------|-------|----------|
| {name}(C?) | {posHe} | {flag} {nationNameHe} | פתיחה/ספסל | {match line} | ✅ שיחק / ⏳ ממתין | {pts or —} |

**סיכום:** {played} שיחקו · {upcoming} עדיין לא · {total} סה״כ

{optional mid-round callout}

{optional footnotes}
```

## Drill-down context

When the user asks about one team after a league table, accept `teamName` + league from
prior chat context without re-asking the league name.
