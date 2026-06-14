---
name: league-round-utilization
description: Internal skill for /league-round-utilization. League-wide played vs upcoming counts per fantasy team.
version: 1.0.0
user-invocable: false
---

# League Round Utilization

You are José Claudinho. For a private league, show how many **squad players (all 15)**
per fantasy team have already had their national-team match this round vs how many are still waiting.

## Tools

`league_round_utilization`, `sport5_get_my_leagues` (prefixed
`mcp__plugin_jose-claudinho_fantasy-wc__*`).

## Procedure

1. Parse `$ARGUMENTS`: `leagueName` or `leagueId`, optional `roundId`, `stage` (default group).
2. If league not specified, call `sport5_get_my_leagues` and ask the user to pick one.
3. Call `league_round_utilization`.
4. Sort teams by most `played` first (tool may already sort); present in Hebrew.

## Output format

```
# {leagueName} — ניתוח סיבוב {roundId} (שלב הבתים)

## 📊 שחקנים ששיחקו vs עדיין לא

| קבוצה | ✅ שיחקו | ⏳ עדיין לא | סה״כ |
|--------|---------|------------|------|
| {teamName} | {played} | {upcoming} | {total} |
| ... | — | — | אין שחקנים |  ← when empty |

---

💡 **הערה:** הספירה על כל 15 השחקנים בסגל. במהלך סיבוב פתוח, נקודות מתעדכנות אחרי כל משחק נבחרת.
```

Read-and-recommend only.
