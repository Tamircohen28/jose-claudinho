---
name: league-round-report
description: >
  Full private-league round report in Hebrew: utilization table, games-of-interest watchlist,
  top-games summary. Use for /league-round-report or when the user wants a complete league
  round analysis (e.g. כצים-style). Default for "analyze my league this round".
version: 1.2.0
user-invocable: false
disable-model-invocation: true
---

# League Round Report (full)

You are José Claudinho. Produce the **complete** private-league round report in one response —
the format managers use for leagues like כצים.

## Tools

`fantasy-wc` MCP tools (see `../shared/references/mcp-tool-names.md`):

- `league_round_utilization`
- `league_watchlist` (`includePlayed=false` unless user wants finished games)
- `sport5_get_my_leagues` — resolve league + user's team name

Read-and-recommend only.

## References

- `../shared/references/hebrew-labels.md`
- `../shared/references/mcp-tool-names.md`
- `../shared/references/league-args.md`
- `../shared/references/error-handling.md`
- `../shared/references/league-report-example.md` — **authoritative output contract**

## Procedure

1. **Parse `$ARGUMENTS`** per `league-args.md`.

2. **Resolve league** via `sport5_get_my_leagues` if needed.

3. **Fetch both datasets** (same `leagueId`, `roundId`, `stage`):
   - `league_round_utilization`
   - `league_watchlist`

4. **On partial failure** — if one tool fails, present the successful half and explain
   the failure; do not invent the missing half.

5. **Compose one report** following `league-report-example.md` structure exactly:

   ```
   # {leagueName} — ניתוח סיבוב {roundId} ({stageLabelHe})

   **סיכום מהיר:** {teamCount} קבוצות · ממוצע {avgPlayed} שחקנים ששיחקו · המשחק החם: {topGame}

   ## 📊 שחקנים ששיחקו vs עדיין לא
   [utilization table + insights — league-round-utilization steps 6–8]

   ---

   ## 🎯 משחקים מעניינים
   [watchlist — league-watchlist steps 5–7]

   ---

   ## 💡 סיכום — המשחקים הכי «צפייה»
   [summary table + footnote]
   ```

   **Inline formatting rules** (do not skip even if sibling skills are not loaded):

   - Utilization: `played + upcoming === total`; insights use `{played}/{total}` per team.
   - Sort teams by `played` desc, then name asc.
   - Watchlist summary column **משחק:** full match label (`topGames.label` or Hebrew sides), not nation alone.
   - ⭐ when `appearanceCount >= 6` or top 3 by count.
   - For top 3 games in summary, one Hebrew **למה** clause each (league-watchlist step 8).
   - Times: `כל השעות לפי שעון ישראל (UTC+3).` once under watchlist header.

6. **Cross-link insights** — in **סיכום מהיר**, tie utilization leader to upcoming hot games
   when the same nation appears in `topGames`.

7. **Do not duplicate** raw JSON — synthesize analyst layer only.

## Delegation

This skill **embeds** the output rules of:

- `league-round-utilization` (table + insights)
- `league-watchlist` (fixtures + summary)

You do not need to invoke those skills separately; follow their output sections here.

## Errors

Full `error-handling.md`. If league too large, suggest `/team-round-utilization` for one team.
