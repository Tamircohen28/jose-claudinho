# Error handling — round utilization & squad skills

Read-and-recommend only. Never invent squad data, fixtures, or points.

## Missing or expired cookie

**Symptoms:** Tool returns message about `SPORT5_COOKIE`, empty team, or auth error.

**Action:**

1. Tell the user private reads need their Sport5 session.
2. Point to `/fantasy-setup` or DevTools cookie copy from fantasywc.sport5.co.il.
3. Do **not** continue with fabricated tables.

## League not found

**Symptoms:** `No league matching "…" in your leagues list`.

**Action:**

1. Call `sport5_get_my_leagues`.
2. Print a numbered list: `{leagueName} (id {leagueId})`.
3. Ask user to re-run with exact name or id.

## League too large (>50 teams)

**Symptoms:** Error about more than 50 teams.

**Action:**

1. Explain league-wide tools are capped at 50 teams (private leagues only).
2. Suggest passing a **private league** name/id, not the overall Sport5 league.
3. Offer `/team-round-utilization` for a single team instead.

## Per-team fetch error

**Symptoms:** Tool row has `error` or `empty: true`.

**Action:**

- Show the team row with `— | — | — | אין שחקנים` or `שגיאה: {error}`.
- Do not drop the team silently from the table.

## Fixture not matched (`fixture: null`)

**Symptoms:** Player has nation but no fixture in current round.

**Action:**

- In table: משחק = `—`, סטטוס = `לא נמצא משחק`.
- Note once in footnote: nation→TheSportsDB alias may need updating (Hebrew/English mismatch).

## Mid-round points lag

**Symptoms:** `played: true` but `roundPoints: null`.

**Action:**

- Show `—` for points; footnote: Sport5 updates `lastRoundPoints` after each nation
  match; not live minute-by-minute.

## Sport5 or TheSportsDB outage

**Symptoms:** Network error, empty fixtures with `note` field.

**Action:**

- Quote the tool error/note.
- Do not fill gaps with assumptions.
- Retry once if transient; otherwise stop with clear message.

## Empty watchlist

**Symptoms:** `fixtures: []` with no error.

**Action:**

Use empty-state template from `league-report-example.md`.
