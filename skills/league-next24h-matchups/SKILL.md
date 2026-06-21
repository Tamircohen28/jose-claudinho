---
name: league-next24h-matchups
description: >
  Shows every World Cup match kicking off in the next 24 hours (Israel time) and
  which fantasy teams in a private league own players in each game. Use for
  /league-next24h-matchups or when the user asks "what games are on today/tonight
  with my league players" or "who in כצים plays tonight".
version: 1.0.0
disable-model-invocation: true
allowed-tools: [
  "mcp__plugin_jose-claudinho_fantasy-wc__worldcup_fixtures",
  "mcp__plugin_jose-claudinho_fantasy-wc__league_watchlist",
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_my_leagues"
]
---

> **Multi-host:** `allowed-tools` enforces access on Claude Code only. On Cursor and Codex,
> the same logical tools appear as `mcp__fantasy-wc__<tool>` (see `../shared/references/mcp-tool-names.md`).

# League Next-24h Matchup Report

Produce a clean matchup list: every WC game kicking off in the next 24 hours
(Israel time), annotated with which הכצים (or named) fantasy-league teams own
players on each side.

## Tools

- `worldcup_fixtures` — upcoming WC fixtures with UTC kickoff times
- `league_watchlist` — current-round fixtures with fantasy-team player mappings
- `sport5_get_my_leagues` — resolve league name → id when not hardcoded

Read-and-recommend only.

## Procedure

### Step 1 — Get current Israel time

Run via Bash:
```bash
TZ=Asia/Jerusalem date +"%Y-%m-%dT%H:%M:%S"
```
Israel is UTC+3 (no DST during the WC). Derive `now_IL` and `cutoff_IL = now_IL + 24h`.

### Step 2 — Fetch upcoming WC fixtures

Call `worldcup_fixtures(when="next", limit=50)`.

Each fixture has a `date` (YYYY-MM-DD UTC) and `time` (HH:MM UTC). Combine them
into an ISO UTC timestamp. Convert to Israel time (+3h). Keep only fixtures where
`kickoff_IL` is strictly between `now_IL` and `cutoff_IL`.

If no fixtures fall in the window, output:
```
No World Cup matches in the next 24 hours.
```
and stop.

### Step 3 — Resolve the league

Default league: **הכצים** (id `36127`).
If `$ARGUMENTS` names a different league, call `sport5_get_my_leagues` to find it.
Record the resolved league id as `leagueId` (defaulting to `36127`) and use it for all
subsequent calls in Steps 4 and 7 — never hardcode `36127` once a different league was named.

### Step 4 — Fetch league player-fixture mappings

Call `league_watchlist(leagueId=<resolved leagueId>, includePlayed=false)`.

The tool returns `fixtures[]`, each with:
- `fixture.homeTeam`, `fixture.awayTeam` — English team names
- `fixture.timeIsrael`, `fixture.dateIsrael` — already in IL time
- `sides` — keyed by nationTeamId:
  ```
  sides[id] → { nationNameHe, nationFlag, teams: [{ fantasyTeamName, players: ["name", …] }] }
  ```

### Step 5 — Match 24h fixtures to watchlist

For each fixture kept in Step 2, find its counterpart in the watchlist by matching
English team names (`homeTeam` / `awayTeam`) case-insensitively. Use the matched
entry's `sides` data for player ownership.

If a 24h fixture is **not** in the watchlist (it belongs to the next fantasy round,
or simply has no league players), both sides are treated as empty.

### Step 6 — Output

Print **only** the formatted list below — no headers, no totals, no extra prose.
Fixtures in **chronological order** by Israel kickoff time.

```
[HH:MM] <Team A> vs <Team B>:
For <Team A> plays:
<Player Name> - <Fantasy team name>
...
For <Team B> plays:
<Player Name> - <Fantasy team name>
...
```

Rules:
- `HH:MM` = Israel kickoff time. Use `fixture.timeIsrael` from the watchlist when
  available; otherwise derive from UTC time +3h.
- `<Team A>` / `<Team B>` = English names from `worldcup_fixtures` output.
- If a side has no league players: output `(no players owned in the league)`.
- If one player is owned by multiple fantasy teams, print one line per team.
- No blank lines between fixtures except the mandatory blank line after the last
  "For … plays:" block before the next fixture header.

### Step 7 — Edge cases

| Situation | Handling |
|-----------|----------|
| Game in the *next* fantasy round (not covered by `league_watchlist`) | Show `(no players owned in the league)` for both sides; add note: `[next round — watchlist not available yet]` |
| `league_watchlist` call fails | Fall back: call `league_round_utilization(leagueId=<resolved leagueId>)` to get each team's player list; cross-reference nationTeamId against the 24h fixture nations manually |
| `worldcup_fixtures` returns no `date`/`time` for a game | Include the game with `[?:??]` and skip the 24h filter for it |

## Arguments

`$ARGUMENTS` may contain:
- A league name (e.g. `כצים`, `friends`) — overrides the default league.
- Nothing — use הכצים (id 36127) automatically.
