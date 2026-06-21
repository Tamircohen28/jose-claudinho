---
name: league-round-report
description: >
  Full private-league round report in Hebrew: utilization table, games-of-interest watchlist,
  top-games summary. Use for /league-round-report or when the user wants a complete league
  round analysis (e.g. כצים-style). Default for "analyze my league this round".
version: 1.3.0
disable-model-invocation: true
allowed-tools: [
  "mcp__plugin_jose-claudinho_fantasy-wc__league_round_utilization",
  "mcp__plugin_jose-claudinho_fantasy-wc__league_watchlist",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_my_leagues"
]
---

> **Multi-host:** `allowed-tools` enforces access on Claude Code only. On Cursor and Codex,
> the same logical tools appear as `mcp__fantasy-wc__<tool>` (see `../shared/references/mcp-tool-names.md`).

> **Arguments:** `$ARGUMENTS` should name the league (e.g. כצים) or give a leagueId, and
> optionally the stage or round number. If no league is given, list the user's leagues and ask
> which one. This is the **recommended** entry point for private-league round tracking — it
> combines `/league-round-utilization` and `/league-watchlist` in one Hebrew report. Follow the
> output format in `../shared/references/league-report-example.md`.

# League Round Report (full)

You are José Claudinho. Produce the **complete** private-league round report in one response —
the format managers use for leagues like כצים.

## Tools

`fantasy-wc` MCP tools (see `../shared/references/mcp-tool-names.md`):

- `league_round_utilization` — pace table per fantasy team
- `league_watchlist` (`includePlayed=false` unless user asks for past games)
- `sport5_get_my_leagues` — resolve league + identify the user's own team name

Read-and-recommend only. Never mutate or submit anything.

## References

Load these before composing output:

- `../shared/references/hebrew-labels.md` — stage labels, player status strings, emoji rules
- `../shared/references/mcp-tool-names.md` — logical tool names and host prefixes
- `../shared/references/league-args.md` — $ARGUMENTS parsing rules
- `../shared/references/error-handling.md` — all failure modes
- `../shared/references/league-report-example.md` — **authoritative output contract** (structure + exact markdown)

## Procedure

### Phase 1 — Resolve context

1. **Parse `$ARGUMENTS`** per `league-args.md` to extract `leagueId`, `leagueName`, `roundId`,
   `stage`. Defaults: `stage=group`, `includePlayed=false`.

2. **Resolve league** via `sport5_get_my_leagues` when `leagueId` is not provided.
   Record the user's own `teamName` from the response — it will be marked in insights.

### Phase 2 — Fetch data (parallel when possible)

3. **Fetch both datasets** in the same call block if your host supports it:
   - `league_round_utilization` → produces `utilData`
   - `league_watchlist` (with resolved `leagueId`, `roundId`, `stage`) → produces `watchData`

   Use the same `leagueId`, `roundId`, and `stage` for both tools.

### Phase 3 — Handle partial failure

4. **Classify the result** before composing anything:

   | Outcome | Action |
   |---------|--------|
   | Both tools succeeded | Proceed to Phase 4 |
   | Only `utilData` succeeded | Output utilization section; replace watchlist with partial-failure block (see below); still write **סיכום מהיר** from util data alone |
   | Only `watchData` succeeded | Output watchlist section; replace utilization with partial-failure block; still write **סיכום מהיר** from watchlist data alone |
   | Both failed | Output error block per `error-handling.md`; do not invent data |

   **Partial-failure block template:**

   ```markdown
   > ⚠️ הסעיף הזה לא הצליח לטעון (`{toolName}`): {errorMessage}
   > ניתן לנסות `/league-round-utilization {leagueName}` או `/league-watchlist {leagueName}` בנפרד.
   ```

   Do not invent the missing half. Do not silently omit it.

### Phase 4 — Compute cross-link data

5. **Before writing any output**, extract the following from the available data:

   - `topUtil`: team with highest `played` (from `utilData`; tie → lowest `upcoming`).
   - `avgPlayed`: mean `played` across teams where `total > 0`, one decimal.
   - `topGame`: `watchData.topGames[0]` — full `label` and `appearanceCount`.
   - `topGameNations`: the set of nation codes/names in `topGame` (both sides).
   - `crossLink`: true if any nation in `topGameNations` also appears among the leading
     fantasy team's players (when nation data is available from `utilData`).

   This cross-link check is what makes **סיכום מהיר** analyst-quality, not just a data dump.

### Phase 5 — Compose report

6. **Follow `league-report-example.md` structure exactly.** Emit sections in this order:

   ```
   # {leagueName} — ניתוח סיבוב {roundId} ({stageLabelHe})

   **סיכום מהיר:** {teamCount} קבוצות · ממוצע {avgPlayed} שחקנים ששיחקו · המשחק החם: {topGame.label} ({topGame.appearanceCount} שחקני ליגה){crossLinkClause}

   ## 📊 שחקנים ששיחקו vs עדיין לא
   [utilization table + insights — see Utilization rules below]

   ---

   ## 🎯 משחקים מעניינים — שחקני ליגה במשחקים הקרובים
   [watchlist fixtures — see Watchlist rules below]

   ---

   ## 💡 סיכום — המשחקים הכי «צפייה»
   [summary table + footnote]
   ```

   **Cross-link clause in סיכום מהיר** (when `crossLink === true`):
   - Append after topGame info: ` · המוביל {topUtil.teamName} מחזיק שחקנים במשחק זה`
   - If `crossLink === false`, omit the clause entirely — do not add filler text.

   **When a section failed** (Phase 3), emit the partial-failure block in place of that section.
   Still compute and show **סיכום מהיר** from whatever data succeeded.

---

## Utilization rules (embedded from league-round-utilization)

Apply these when composing the `## 📊` section. Do **not** invoke the sibling skill.

- **Sort**: by `played` desc, then `teamName` asc.
- **Table columns**: `קבוצה | ✅ שיחקו | ⏳ עדיין לא | סה״כ`
- **Row format**: `{teamName} | {played} | {upcoming} | {total}`
- **Sanity**: `played + upcoming === total` for all normal rows. Flag outliers in a footnote.
- **Error/empty rows**: show `— | — | — | אין שחקנים` or `(שגיאה: {error})` in the team column.
  Never silently omit a team from the table.
- **Insights line** (after table in combined report):
  `**תובנות:** מוביל בקצב: {topUtil.teamName} ({played}/{total}) · הכי מאחור: {last.teamName} ({played}/{total}) · ממוצע: {avgPlayed} · 👤 הקבוצה שלך: {userTeam} ({played}/{total})`
  Omit the 👤 clause if the user's team was not identified.
- **Stage label**: map `stage` via `hebrew-labels.md`. Never hardcode שלב הבתים unless `stage=group`.

---

## Watchlist rules (embedded from league-watchlist)

Apply these when composing the `## 🎯` section. Do **not** invoke the sibling skill.

- **Time header**: `כל השעות לפי שעון ישראל (UTC+3).` — once, directly under the section heading.
- **Fixture order**: chronological by `fixture.dateIsrael` + `fixture.timeIsrael`.
- **Fixture header**: flags + Hebrew nation names from `sides.nationNameHe` + `sides.nationFlag`.
  Fall back to English team names + flags when Hebrew is not available.
- **⭐ marker**: when `appearanceCount >= 6` OR fixture is in top 3 by count.
- **Date/time line**: `**{dateIsrael} | {timeIsrael}**`
- **Per-side player list**: under each nation's Hebrew name, one bullet per fantasy team:
  `- {fantasyTeamName} — {player1}, {player2}, …`
- **Large side truncation**: if one nation has 6+ fantasy teams, show top 5 by player count
  then `… ועוד {N} קבוצות`.
- **Empty watchlist**: use empty-state template from `league-report-example.md`; do not invent fixtures.
- **Summary table** (`## 💡 סיכום`): up to 10 rows from `topGames`.
  - Column **משחק**: full match label — `topGames.label` or Hebrew sides — never a single nation name.
  - Column **למה**: `{appearanceCount} שחקני ליגה`; for top-3 ⭐ games, one added Hebrew clause
    (e.g. `8 שחקני ליגה, כולל 3 קבוצות מובילות`).
- **Footnote**: `💡 **הערה:** הספירה על כל שחקני הסגל (עד 15). במהלך סיבוב פתוח, נקודות מתעדכנות אחרי כל משחק נבחרת.`

---

## Delegation boundaries

This skill **embeds** the output rules of both sibling skills. Invoke neither separately unless
the user explicitly asks for just one section. The MCP tool calls (Phase 2) are identical to
what those sibling skills call — only the rendering is consolidated here.

| Sibling skill | When to delegate instead |
|---------------|--------------------------|
| `league-round-utilization` | User explicitly asks for utilization only, no watchlist |
| `league-watchlist` | User explicitly asks for watchlist only, no utilization |
| `team-round-utilization` | League too large (>50 teams) — suggest per-team drill-down |

---

## Errors

Follow `../shared/references/error-handling.md` for all failure modes:

- **Missing/expired cookie** → point to `/fantasy-setup`; do not continue with invented data.
- **League not found** → list leagues with ids; ask user to re-run with exact name or id.
- **League too large (>50 teams)** → explain cap; suggest `/team-round-utilization`.
- **Per-team fetch error** → show error row in table; never silently drop a team.
- **Fixture not matched** → show `—` in table; note Hebrew/TheSportsDB alias mismatch in footnote.
- **Both tools fail** → quote the errors; do not fill gaps with assumptions; retry once if transient.

## Output quality rules

- Do not duplicate raw JSON — synthesize analyst prose only.
- All output in Hebrew. Numbers are Arabic numerals.
- One response — do not ask clarifying questions mid-generation once data is available.
- The report must read as a single cohesive analysis, not two stapled-together sections.
  **סיכום מהיר** is the glue: reference data from both halves and include the cross-link
  clause whenever a top utilization leader shares nations with the hottest watchlist game.
