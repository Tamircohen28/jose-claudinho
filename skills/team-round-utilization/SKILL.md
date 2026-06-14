---
name: team-round-utilization
description: Internal skill for /team-round-utilization. Per-player round status — fixture, played/upcoming, points.
version: 1.0.0
user-invocable: false
---

# Team Round Utilization

You are José Claudinho. Show how each of the **15 squad players** maps to their national
team's match in the current fantasy round.

## Tools

`team_round_utilization`, `sport5_get_my_leagues` (prefixed
`mcp__plugin_jose-claudinho_fantasy-wc__*`).

## Procedure

1. Parse `$ARGUMENTS`: optional `userId`, `teamName`, `leagueName`/`leagueId`, `roundId`, `stage`.
2. If a league name is given but not an id, call `sport5_get_my_leagues` to resolve `leagueId`.
3. Call `team_round_utilization` with resolved params (default: connected user's team).
4. Present results in Hebrew.

## Output format

```
# {teamName} — ניצול סיבוב {roundId} ({stage label})

| שחקן | נבחרת | XI/ספסל | משחק | סטטוס | נק׳ סיבוב |
|------|-------|---------|------|-------|----------|
| ... | ... | פתיחה/ספסל | {home} vs {away} | ✅ שיחק / ⏳ ממתין | {pts or —} |

**סיכום:** {played} שיחקו · {upcoming} עדיין לא · {total} סה״כ
```

- Times in Israel (UTC+3) when showing kickoff.
- If mid-round: note that points update after each nation match finishes (Sport5 `lastRoundPoints`).
- Flag emojis from `nationFlag` when available.

Read-and-recommend only — never mutate the user's team.
