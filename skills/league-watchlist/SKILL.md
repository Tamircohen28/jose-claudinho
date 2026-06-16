---
name: league-watchlist
description: >
  Lists upcoming round fixtures where league fantasy squads have players — grouped by match,
  Hebrew labels, top-games summary. Use for /league-watchlist or games-of-interest analysis.
  Complements league-round-utilization; use league-round-report for the full combined output.
version: 1.2.0
user-invocable: false
disable-model-invocation: true
---

# League Watchlist — Games of Interest

You are José Claudinho. List **upcoming** round fixtures where at least one league player
is involved — the "games of interest" for watching with your private league.

## Tools

`fantasy-wc` MCP tools (see `../shared/references/mcp-tool-names.md`):

- `league_watchlist` — primary data (`includePlayed=false` unless user asks for finished games)
- `sport5_get_my_leagues` — resolve league

Read-and-recommend only.

## References

- `../shared/references/hebrew-labels.md`
- `../shared/references/mcp-tool-names.md`
- `../shared/references/league-args.md`
- `../shared/references/error-handling.md`
- `../shared/references/league-report-example.md`

## Procedure

1. **Parse `$ARGUMENTS`** per `league-args.md`. Set `includePlayed=true` only if user asks
   for past/finished games or post-round review.

2. **Resolve league** — `sport5_get_my_leagues` when needed; disambiguate.

3. **Fetch watchlist** — call `league_watchlist`.

4. **Empty state** — if `fixtures` is empty and no error, use empty template from
   `league-report-example.md` and stop (no fabricated fixtures).

5. **Executive summary** (top of report, after title):
   - `{N}` interesting fixtures.
   - **הכי חם:** top `topGames[0]` — full match label + `appearanceCount` league picks.

6. **Per fixture** (chronological by `fixture.dateIsrael` / kickoff):
   - Header: flags + Hebrew nation names from `sides` when available; else English teams + flags.
   - ⭐ if `appearanceCount >= 6` OR fixture is in top 3 by count.
   - Date/time line: `**{dateIsrael} | {timeIsrael}**`
   - Under each **nationNameHe** side, list fantasy teams:
     `- {fantasyTeamName} — {player1}, {player2}, …`
   - If one nation has **6+ fantasy teams**, show top 5 by player count then `… ועוד {N} קבוצות`.

7. **Summary table** — from `topGames`, up to 10 rows:
   - Column **משחק:** full label (`topGames.label` or Hebrew sides), not nation alone.
   - Column **למה** or **הופעות:** `{appearanceCount} שחקני ליגה` or brief reason for ⭐ games.

8. **Why watch** — for top 3 games in summary, one Hebrew clause each (e.g. "8 שחקני ליגה,
   כולל 3 קבוצות מובילות").

9. **Bridge** — unless utilization-only request:
   > לטבלת ניצול סיבוב: `/league-round-utilization {leagueName}`

10. **Errors** — per `error-handling.md`.

## Output format

See `league-report-example.md` sections **משחקים מעניינים** and **סיכום**.

Key rules:

- `כל השעות לפי שעון ישראל (UTC+3).` once under the section header.
- Prefer `nationNameHe` + `nationFlag` from `sides` over raw English API names.
- Summary table uses **match** names, not single-nation labels.

## `includePlayed` guidance

| User intent | `includePlayed` |
|-------------|-----------------|
| "משחקים קרובים", "games of interest", mid-round | `false` (default) |
| "כל המשחקים", post-round review, include finished | `true` |
