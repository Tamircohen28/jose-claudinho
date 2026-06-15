# Parsing league and round arguments

Applies to: `league-round-utilization`, `league-watchlist`, `league-round-report`,
and `team-round-utilization` when a league context is needed.

## `$ARGUMENTS` parsing order

1. **Numeric league id** — if the argument is or contains a bare integer (e.g. `12345`),
   treat as `leagueId`.
2. **Stage keyword** — `group`, `r32`, `r16`, `qf`, `sf`, `final` (case-insensitive).
3. **Round number** — `round 2`, `סיבוב 2`, or lone small integer with league name
   (prefer explicit `roundId` only when user says "round N").
4. **League name** — remaining text as `leagueName` substring (e.g. `כצים`, `Haktzim`).

Multiple tokens example: `כצים group` → leagueName=כצים, stage=group.

## Resolving league name → id

1. Call `sport5_get_my_leagues`.
2. Match `leagueName` case-insensitively against `leagueName` field (substring).
3. **Zero matches** — list all leagues with id + name; ask user to pick.
4. **Multiple matches** — list matches with ids; ask user to disambiguate.
5. **One match** — use that `leagueId`.

Never guess a league id when ambiguous.

## Team name lookup (team-round-utilization only)

When `$ARGUMENTS` includes a fantasy **team name** (not league name alone):

1. Resolve `leagueId` first (required for name lookup in MCP).
2. Pass `teamName` + `leagueId` to `team_round_utilization`.
3. If not found, list teams from `sport5_get_league_table` for that league (first page).

## Defaults

| Param | Default |
|-------|---------|
| `stage` | `group` |
| `roundId` | omit — tool reads from league `roundId` |
| `includePlayed` | `false` (watchlist only) |
