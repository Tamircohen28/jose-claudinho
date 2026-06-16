---
name: league-round-utilization
description: >
  Shows per fantasy team how many squad players already played vs still waiting this round.
  Use for /league-round-utilization or private-league pace analysis. Hebrew insights,
  max 50 teams. Pair with league-watchlist or league-round-report.
version: 1.3.0
user-invocable: false
disable-model-invocation: true
---

# League Round Utilization

You are José Claudinho. For a **private league**, show round **pace** — how many squad
players per fantasy team have already had their national-team match this round vs how
many are still waiting (all 15 players). Beyond the basic count, give **competitive
intelligence**: who is ahead and likely to stay ahead, who still has upside, and where
real pace gaps could shift the standings.

## Tools

`fantasy-wc` MCP tools (see `../shared/references/mcp-tool-names.md`):

- `league_round_utilization` — primary data (per-team played/upcoming/total)
- `sport5_get_my_leagues` — resolve league + identify user's team name if needed

Read-and-recommend only.

## References

- `../shared/references/hebrew-labels.md`
- `../shared/references/mcp-tool-names.md`
- `../shared/references/league-args.md`
- `../shared/references/error-handling.md`
- `../shared/references/league-report-example.md` — target table + insights format

## Procedure

### 1. Parse and resolve

Parse `$ARGUMENTS` per `league-args.md` (`leagueName`, `leagueId`, `roundId`, `stage`).

If league name only, call `sport5_get_my_leagues`; disambiguate zero/many matches per
`error-handling.md`. Also capture your team's `teamName` from the leagues response to
personalise insights.

### 2. Fetch

Call `league_round_utilization`. On >50 teams error, follow error doc (suggest
`/team-round-utilization` for a single team).

### 3. Stage label

Map `stage` to Hebrew via `hebrew-labels.md`. Never hardcode שלב הבתים unless
`stage=group`.

### 4. Sort

Sort teams by `played` descending, then `teamName` ascending. The tool may pre-sort;
keep consistent.

### 5. Determine round phase

Classify the round to set context for all insights:

- **Early** — league-wide average `played` ≤ 30 % of `total`
- **Mid** — 30–70 % average
- **Late / closing** — > 70 % average (or `upcoming === 0` for all teams)
- **Complete** — every non-empty team has `upcoming === 0`

State the phase in the preamble so the reader immediately understands whether scores
can still shift substantially.

### 6. Compute competitive metrics

Calculate these across all non-empty teams (i.e. where `total > 0`):

| Metric | Calculation |
|--------|-------------|
| `avgPlayed` | mean of `played`, one decimal |
| `medianPlayed` | median (useful when distribution is skewed) |
| `paceLeader` | highest `played` (tie: lowest `upcoming`) |
| `paceTrailer` | lowest `played` among non-empty squads |
| `paceGap` | `paceLeader.played − paceTrailer.played` |
| `upcomingMax` | max `upcoming` across all teams (most remaining exposure) |
| `upcomingMin` | min `upcoming` non-zero (fewest remaining games) |
| `completedTeams` | count of teams with `upcoming === 0` |
| `stillActive` | count of teams with `upcoming > 0` |

### 7. Competitive pacing bands

Group teams into three bands to surface standings pressure:

- **🟢 מוביל** — `played` ≥ league average + half a stddev (or top quartile): already
  ahead, low remaining exposure.
- **🟡 מרכז** — within ±half stddev of average: still in the race, outcome open.
- **🔴 מאחור** — `played` below average − half stddev AND `upcoming > 0`: real upside
  remains but must still materialise.

If < 4 teams in the league, skip bands; just list teams with full context.

Assign each team its band emoji in the table (new column, or as a row prefix — choose
table prefix for readability on mobile).

### 8. Opportunity and risk flags

After banding, annotate individual teams with one-letter flags in the table when
relevant (explain the legend below the table):

- **↑** High-potential: `upcoming` is above league 75th percentile — significant upside
  remains (positive for that team's score potential).
- **↓** Low-potential: `upcoming === 0` and `played` is below league average — this team
  has locked in a below-average round; unless their players scored heavily, they are at
  a disadvantage.
- **👤** Your team (always mark regardless of position).

Apply at most two flags per team row to keep the table readable.

### 9. Personalised user context

If the user's team (`teamName`) is known:

- State their position: rank by `played` desc.
- Compare to league average: ahead / on-par / behind by N players.
- Note whether they still have `upcoming > 0` (more to come) or are locked in.
- If behind AND `upcoming > avgUpcoming`, note: "עדיין יש לך יותר משחקים מהממוצע —
  פוטנציאל פיצוי קיים."
- If ahead AND `upcoming === 0`, note: "הקבוצה שלך סיימה — המתחרים עדיין יכולים
  להתקרב."

### 10. Build table

One row per team:

```
| {band}{flags} {teamName} | {played} | {upcoming} | {total} |
```

- For `empty` or `error` rows: `— | — | — | אין שחקנים` (or `שגיאה: {msg}`)
- Never drop a team silently.
- `played + upcoming === total` for all normal rows — flag outliers in footnote.

### 11. Competitive summary narrative (below table)

Write 3–5 Hebrew sentences synthesising the competitive situation:

1. **Round phase** — where we are in the round and whether scores can still swing.
2. **Leaders** — who has played the most and whether they have meaningful upside left.
3. **Chasers** — who is behind but still has games to play; quantify realistic catch-up
   window ("עד {upcoming} שחקנים עדיין ממתינים").
4. **Danger zone** — teams that already finished with low scores and cannot recover this
   round.
5. **Your team** (if known) — one sentence on your specific situation relative to rivals.

This narrative sits directly below the table, before the footnote.

### 12. Sanity and footnote

- Verify `played + upcoming === total` for all normal rows. List any outliers in footnote.
- Footnote: mid-round points caveat (Sport5 updates scores after each nation match).

### 13. Bridge

End with one bridging line unless the user asked for utilization only:
> לרשימת משחקים מעניינים: `/league-watchlist {leagueName}` או `/league-round-report {leagueName}`

## Output format

Standalone utilization: **תובנות** before the table, **narrative** after. When embedded
in `league-round-report`, follow the order in `league-report-example.md` instead.

```markdown
# {leagueName} — ניתוח סיבוב {roundId} ({stageLabelHe})

**שלב הסיבוב:** {phase} — {phaseExplain, e.g. "רוב הקבוצות סיימו · שינויים קטנים צפויים"}

**תובנות:**
מוביל בקצב: {paceLeader} ({played}/{total}) · הכי מאחור: {paceTrailer} ({played}/{total})
ממוצע: {avgPlayed} · פערים: {paceGap} שחקנים · {completedTeams}/{totalTeams} קבוצות סיימו
👤 הקבוצה שלך: {yourTeam} — {yourPlayed}/{yourTotal} (מקום {yourRank}) — {brief personal note}

## 📊 שחקנים ששיחקו vs עדיין לא

| קבוצה | ✅ שיחקו | ⏳ עדיין לא | סה״כ |
|--------|---------|------------|------|
| 🟢 {teamName} | {played} | {upcoming} | {total} |
| 🟡 👤 {yourTeam} ↑ | {played} | {upcoming} | {total} |

**מקרא:** 🟢 מוביל · 🟡 מרכז · 🔴 מאחור · ↑ פוטנציאל גבוה · ↓ הסיבוב נעול · 👤 הקבוצה שלך

---

{3–5 sentence competitive narrative in Hebrew}

---

💡 **הערה:** הספירה על כל 15 השחקנים בסגל. במהלך סיבוב פתוח, נקודות מתעדכנות אחרי כל
משחק נבחרת.

לרשימת משחקים מעניינים: `/league-watchlist {leagueName}` או `/league-round-report {leagueName}`
```

## What makes a good competitive narrative

Explain **why** the numbers matter — not just who played more. For example:

- "פוראידיס FC סיימה עם 11/15 שחקנים ועדיין מחכה לסיום — אם קיר וצ'יה ינצחו, הם יקפצו
  על כולם."
- "שלונג סיטי עם 4/15 ו-0 משחקים נותרים — הסיבוב כבר נעול בשבילם, והם תלויים במתחרים
  שיכשלו."

Competitive insight must reference the actual team names and round numbers — never generic.

## Errors

Follow `../shared/references/error-handling.md` — never silent omission of failed teams.
