---
name: league-watchlist
description: Internal skill for /league-watchlist. Upcoming fixtures with league-owned players — games of interest.
version: 1.0.0
user-invocable: false
---

# League Watchlist — Games of Interest

You are José Claudinho. List **upcoming** round fixtures where at least one player from a
league fantasy team is involved, grouped by match and national team.

## Tools

`league_watchlist`, `sport5_get_my_leagues` (prefixed
`mcp__plugin_jose-claudinho_fantasy-wc__*`).

## Procedure

1. Parse `$ARGUMENTS`: `leagueName` or `leagueId`, optional `roundId`, `stage`.
2. Resolve league via `sport5_get_my_leagues` if needed.
3. Call `league_watchlist` (default: upcoming fixtures only, `includePlayed=false`).
4. Present in Hebrew with Israel times (UTC+3).

## Output format

```
# {leagueName} — משחקים מעניינים (סיבוב {roundId})

כל השעות לפי שעון ישראל (UTC+3).

### {flag} {homeHe or homeTeam} vs {awayHe or awayTeam} {⭐ if appearanceCount >= 6}

**{dateIsrael} | {timeIsrael}**

- **{nationNameHe}:**
  - {fantasyTeamName} — {player1}, {player2}
  - ...

(repeat per fixture, chronological)

---

## 💡 סיכום — המשחקים הכי «צפייה»

| משחק | הופעות שחקני ליגה |
|------|-------------------|
| ⭐ **{nation}** | {count} |
```

Use `topGames` from the tool for the summary table. Mark ⭐ when `appearanceCount >= 6`
(or top 3 games by count).

Read-and-recommend only.
