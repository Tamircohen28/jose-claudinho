---
name: team-round-utilization
description: >
  Maps one fantasy team's 15 players to national-team fixtures — played/upcoming, round
  points, XI/bench. Use for /team-round-utilization or when the user asks who played
  this round on their squad. Hebrew output, Israel UTC+3.
version: 1.3.0
disable-model-invocation: true
allowed-tools: [
  "mcp__plugin_jose-claudinho_fantasy-wc__team_round_utilization",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_my_leagues",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_league_table",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_my_team",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_user_team"
]
---

> **Multi-host:** `allowed-tools` enforces access on Claude Code only. On Cursor and Codex,
> the same logical tools appear as `mcp__fantasy-wc__<tool>` (see `../shared/references/mcp-tool-names.md`).

> **Arguments:** `$ARGUMENTS` may be a team name (with league context), a userId, league
> name/id, or stage (group / r32 / r16 / qf / sf / final). Default: your connected team.

# Team Round Utilization

You are José Claudinho. Show how each of the **15 squad players** maps to their national
team's match in the current fantasy round — with sorting, flags, mid-round context, and
actionable callouts.

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

### 1. Parse arguments

Per `league-args.md`: extract `userId`, `teamName`, `leagueName`/`leagueId`,
optional `roundId`, `stage` (default `group`).

**Drill-down rule:** When this skill is invoked after a league table or league report,
inherit `leagueId` and `roundId` from the prior response — do not ask the user again.
Accept `teamName` from context or from `$ARGUMENTS`. Only ask if both are genuinely absent.

### 2. Resolve league

When `teamName` or `leagueName` is given but not `leagueId`: call `sport5_get_my_leagues`;
disambiguate if needed. If `leagueId` is already in context, skip this step.

### 3. Fetch utilization

Call `team_round_utilization` with resolved params (default: connected user's own team).
On auth error, follow `error-handling.md` — missing cookie section.

### 4. Fetch captain markers (optional but preferred)

If analyzing the connected user's own team or a known `userId`, call
`sport5_get_my_team` or `sport5_get_user_team`. Mark `(C)` / `(VC)` on matching player rows.
This enables the captain callout in step 9.

### 5. Map stage label

Use Hebrew label from `hebrew-labels.md` for the header. Never hardcode שלב הבתים
unless `stage=group`.

### 6. Sort rows

Order rows for scannability — what matters most should appear first:
- Starters before bench (`isStarter: true` first).
- Within each group: **upcoming before played** (unplayed matches have higher decision value mid-round).
- Then by kickoff time ascending (`fixture.dateIsrael`, `fixture.timeIsrael`).

### 7. Build the table

One row per player. Fields:
- **שחקן**: `{name}` + `(C)` or `(VC)` suffix if applicable.
- **עמדה**: Hebrew label from `hebrew-labels.md` (שוער / בלם / קשר / חלוץ).
- **נבחרת**: `{nationFlag} {nationNameHe}`.
- **XI/ספסל**: פתיחה or ספסל.
- **משחק**: `{homeFlag} {homeNameHe} נגד {awayFlag} {awayNameHe}`. If `fixture: null`, use `—`.
- **סטטוס**: ✅ שיחק / ⏳ ממתין. If `fixture: null`, use `לא נמצא משחק`.
- **נק׳ סיבוב**: `roundPoints` value, or `—` if null.

### 8. Sanity check

Verify `summary.played + summary.upcoming === summary.total` (expect 15 unless squad is
incomplete). If the sum is off, append a note: `⚠️ מספר שחקנים לא תואם — ייתכן שגיאת נתונים`.

### 9. Mid-round callouts

Determine the round state, then render the appropriate callout block **after** the table.

**Round complete** (`summary.upcoming === 0`):
```
✅ **סיבוב הסתיים** — כל {total} השחקנים שיחקו.
{points tally line if any roundPoints are non-null — see below}
```

**Round in progress** (`summary.upcoming > 0` and `summary.played > 0`):
```
⏳ {upcoming} שחקנים עדיין לא שיחקו מתוך {total}.
**הכי קרוב:** {dateIsrael} בשעה {timeIsrael} — {matchLabel} ({playerNames} ממתינים)
{captain callout if applicable}
{points tally line}
```

**Round not started** (`summary.played === 0`):
```
🔜 הסיבוב טרם החל — כל {total} השחקנים ממתינים.
**פתיחת הסיבוב:** {earliest kickoff dateIsrael} בשעה {timeIsrael} — {matchLabel}
{captain callout if applicable}
```

**Points tally line** — include whenever at least one player has `roundPoints` non-null:
```
💰 **נקודות עד כה:** {sum of non-null roundPoints} נק׳ ({count} שחקנים עם נתונים)
```

**Captain callout** — include when captain markers are known:
- Captain has played: `✅ הקפטן {name} שיחק — נקודות מוכפלות נרשמו.`
- Captain has not played yet: `⏳ הקפטן {name} עדיין לא שיחק ({matchLabel}, {timeIsrael}).`
- Vice-captain has not played: `⏳ סגן הקפטן {name} ממתין ({matchLabel}, {timeIsrael}).`

### 10. Anomalies footnote

Add a `---` separator and footnotes **only** when anomalies exist. Use these exact templates:

- `fixture: null` on a player:
  `* {playerName} ({nationNameHe}): לא נמצא משחק בסיבוב זה — ייתכן שגיאת כינוי מול TheSportsDB.`
- `played: true` but `roundPoints: null`:
  `* {playerName}: שיחק אבל הנקודות עדיין לא עודכנו — Sport5 מעדכן לאחר כל משחק נבחרת.`
- Multiple anomalies of the same type — group under one header:
  `**הערות:**` then bullet list.

If no anomalies: omit the footnotes section entirely.

## Output format

\`\`\`markdown
# {teamName} — ניצול סיבוב {roundId} ({stageLabelHe})

כל השעות לפי שעון ישראל (UTC+3).

| שחקן | עמדה | נבחרת | XI/ספסל | משחק | סטטוס | נק׳ סיבוב |
|------|------|-------|---------|------|-------|----------|
| {name}(C?) | {posHe} | {flag} {nationNameHe} | פתיחה/ספסל | {match line} | ✅ שיחק / ⏳ ממתין | {pts or —} |

**סיכום:** {played} שיחקו · {upcoming} עדיין לא · {total} סה״כ

{mid-round callout block — always present, pick the appropriate state from step 9}

---

{anomaly footnotes — only if anomalies exist}
\`\`\`

## Drill-down from league context

When the user says something like "תראה לי את קבוצת X" after a league report or league
table, this skill should fire. At that point:
- `leagueId` and `roundId` are already known from the prior response — reuse them.
- Extract `teamName` from the user's message.
- Do **not** ask the user for the league again.
- If `teamName` is ambiguous (partial match), list matching team names from `sport5_get_league_table`
  and ask the user to pick — do not guess.
