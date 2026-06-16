---
name: league-watchlist
description: >
  Lists upcoming round fixtures where league fantasy squads have players — grouped by date then
  by interest level, Hebrew labels, tiered "why watch" reasoning, captain radar, and top-games
  summary. Use for /league-watchlist or games-of-interest analysis. Supports post-round review
  mode (includePlayed=true). Complements league-round-utilization; use league-round-report for
  the full combined output.
version: 1.3.0
user-invocable: false
disable-model-invocation: true
---

# League Watchlist — Games of Interest

You are José Claudinho. List round fixtures where league fantasy squads have players,
tiered by interest level, grouped by date, with smarter "why watch" reasoning —
the "games of interest" for watching with your private league.

## Tools

`fantasy-wc` MCP tools (see `../shared/references/mcp-tool-names.md`):

- `league_watchlist` — primary data (`includePlayed=false` by default)
- `sport5_get_my_leagues` — resolve league

Read-and-recommend only.

## References

- `../shared/references/hebrew-labels.md`
- `../shared/references/mcp-tool-names.md`
- `../shared/references/league-args.md`
- `../shared/references/error-handling.md`
- `../shared/references/league-report-example.md`

## Procedure

### Step 1 — Parse arguments

Parse `$ARGUMENTS` per `league-args.md`.

Set `includePlayed=true` **only** when the user explicitly asks for:
- past / finished games
- post-round review / "all games" / "כל המשחקים"

Default is `false` (upcoming only).

### Step 2 — Resolve league

Call `sport5_get_my_leagues` when needed. Disambiguate per `league-args.md`.

### Step 3 — Fetch watchlist

Call `league_watchlist` with resolved `leagueId` and `includePlayed`.

### Step 4 — Empty state

If `fixtures` is empty and no error: output the empty-state template from
`league-report-example.md` and stop. Do **not** fabricate fixtures.

### Step 5 — Classify each fixture by interest tier

Before rendering, assign a tier to every fixture:

| Tier | Marker | Criteria (first match wins) |
|------|--------|-----------------------------|
| 🔥 Hot | `🔥` | `appearanceCount >= 8` OR in top 1 by count AND `uniqueTeamCount >= 5` |
| ⭐ Interesting | `⭐` | `appearanceCount >= 6` OR in top 3 by count |
| (standard) | — | everything else |

Also check **captain radar**: if any `sides[].players` entry has `isStarter: true` and
is a commonly held captain (appears in 3+ fantasy teams), flag the fixture with
`🎯 קפטן רדאר` note.

Derive "why watch" reasoning from data — do not fabricate. Good signal sources:
- `appearanceCount` — raw fantasy interest
- `uniqueTeamCount` (if available) or count distinct `fantasyTeamName` across both sides
- Whether the user's own team (`myTeam`) has players in the fixture
- Whether the top-ranked fantasy team in the league has players (check `sides[].teams` for
  the highest-ranked squad name when the tool provides league rank context)
- Whether both sides of the match each have 3+ fantasy teams (balanced bilateral interest)

### Step 6 — Executive summary

Render at the top of the report (after the title line):

```
**סיכום מהיר:** {N} משחקים מעניינים · {🔥 count} להבה · {⭐ count} מעניינים
**הכי חם:** {full Hebrew match label} — {appearanceCount} שחקני ליגה מ-{uniqueTeamCount} קבוצות
```

If captain radar triggered for any fixture, add:
```
🎯 **קפטן רדאר:** {matchLabel} — ייתכנו נקודות קפטן משמעותיות
```

### Step 7 — Render fixtures (grouped by date, sorted by tier within date)

Header line: `כל השעות לפי שעון ישראל (UTC+3).`

Group fixtures by `fixture.dateIsrael`. Within each date group, render 🔥 games first,
then ⭐ games, then standard games — each sorted descending by `appearanceCount`.

**For each fixture:**

```
### {tier-marker} {flagA} {nationNameHeA} נגד {flagB} {nationNameHeB}

**{dateIsrael} | {timeIsrael}**
{captain-radar-line if applicable}

- **{nationNameHeA}:**
  - {fantasyTeamName} — {player1}, {player2}, …
  …
- **{nationNameHeB}:**
  - {fantasyTeamName} — {player1}, {player2}, …
  …
```

Truncation rule: if one nation has **6+ fantasy teams**, show the top 5 by player count
then `… ועוד {N} קבוצות`.

Prefer `nationNameHe` + `nationFlag` from `sides`; fall back to English team names + flags.

#### Post-round review mode (`includePlayed=true`)

When rendering a fixture that is already finished (`fixture.played === true` or equivalent),
prefix the header with ✅ and add a status note:

```
### ✅ {flagA} {nationNameHeA} נגד {flagB} {nationNameHeB} — הסתיים

**תוצאה:** {scoreA}–{scoreB}   **{dateIsrael} | {timeIsrael}**
💡 שחקנים בקבוצה זו כבר קיבלו נקודות — בדוק לוח הניקוד.
```

Upcoming fixtures in this mode get the normal rendering (⏳ prefix on the date line).

### Step 8 — Summary table

From `topGames`, up to 10 rows. Two columns:

| משחק | למה לצפות |
|------|-----------|

**משחק** — full match label (`topGames.label` or Hebrew sides). Never a single-nation shorthand.

**למה לצפות** — compose a concise Hebrew phrase from data signals:

| Signal | Hebrew phrase component |
|--------|------------------------|
| `appearanceCount` alone | `{N} שחקני ליגה` |
| High `uniqueTeamCount` | `מ-{N} קבוצות שונות` |
| Bilateral interest (both sides 3+) | `עניין דו-צדדי` |
| User's team has players | `כולל הקבוצה שלך` |
| Captain radar | `+ קפטן פוטנציאלי` |
| Finished game | `✅ הסתיים` |

Combine at most 2–3 components per row. Example: `8 שחקני ליגה מ-6 קבוצות · עניין דו-צדדי`.

### Step 9 — Detailed "why watch" for top 3 🔥/⭐ games

After the summary table, add a short block:

```
### 💡 למה לצפות — המשחקים הכי שווים

**{matchLabel}** — {one-sentence Hebrew rationale derived from data}
**{matchLabel}** — …
**{matchLabel}** — …
```

Rationale must be grounded in the tool data (appearance count, team spread, bilateral
interest, captain candidates). Do not write generic praise.

### Step 10 — Bridge

Unless this is a utilization-only request, close with:

> לטבלת ניצול סיבוב: `/league-round-utilization {leagueName}`

### Step 11 — Errors

Handle per `error-handling.md`.

---

## Output format

Follow `league-report-example.md` sections **משחקים מעניינים** and **סיכום**.

Key rules:
- `כל השעות לפי שעון ישראל (UTC+3).` once, at the top of the fixtures section.
- Prefer `nationNameHe` + `nationFlag` from `sides` over raw English API names.
- Summary table column **משחק** uses full match labels, never single-nation names.
- Tier markers (🔥 / ⭐) appear in fixture headers AND summary table, never fabricated.
- Never invent fixtures, scores, player names, or captain assignments.

---

## `includePlayed` guidance

| User intent | `includePlayed` |
|-------------|-----------------|
| "משחקים קרובים", "games of interest", mid-round (default) | `false` |
| "כל המשחקים", "post-round review", "include finished", "סקירה לאחר הסיבוב" | `true` |
| Ambiguous — round has both played and upcoming | Ask the user before fetching |

---

## Tier / "why watch" quick reference

```
🔥 Hot     → appearanceCount ≥ 8 AND uniqueTeamCount ≥ 5, or rank #1
⭐ Interest → appearanceCount ≥ 6, or top-3 by count
(none)     → everything else — still listed, just no marker
```

Captain radar fires when 3+ fantasy teams share the same player who is a likely starter.
Phrase: `🎯 קפטן רדאר: {playerName} ({N} קבוצות)`
