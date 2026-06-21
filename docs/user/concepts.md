# Concepts

## What José Claudinho is

A **Claude Code plugin** that acts as an assistant manager for your
[Sport5 Fantasy World Cup 2026](https://fantasywc.sport5.co.il) team. You ask it for
advice in natural language (or via a slash command); it reads the live game, reasons
under the official rules, and hands you a concrete plan: which transfers to make, who
to captain, and your starting XI and bench.

It is **read-and-recommend only**. It never logs into the app to make changes for you
— it reads data through your own session and gives advice. You apply the plan yourself
in the app. This is a deliberate safety boundary, not a limitation to be removed.

## The three data sources

1. **The Sport5 API** (`dreamteam.sport5.co.il/api/*`) — the player market, your team,
   rival teams, your leagues, and league tables. Most of this is **login-gated**: it
   needs your session cookie (see [quick-start](quick-start.md)).
2. **TheSportsDB** — free public World Cup 2026 fixtures (who plays whom, and when).
   No key required.
3. **Local snapshots** — JSON files in `~/.fantasy-wc-mcp/data/` that capture the top
   teams' squads + the market each round, so the plugin can *learn over time*.

## How it thinks — the weekly loop

The `squad-advice` skill runs a fixed procedure each round:

1. Work out the current **stage** and pull its rules (budget, per-nation cap, transfers).
2. Read **your team** — current XI, bench, captain, budget, transfers left.
3. Check **fixtures** — who actually plays this round, who's eliminated.
4. **Snapshot the top teams** and analyze ownership — most-owned players, popular
   captains, best points-per-million, and *differentials* (high-scoring but
   low-owned, the players that win you rank).
5. Draft transfers, pick a captain and vice, set the XI and bench.
6. **Validate** the whole plan against a hard constraint checklist before showing it.

The "learning" is that ownership analysis is built from the accumulating snapshot
history — the more rounds you snapshot, the better its read on what the best managers
are doing.

## Round utilization (private leagues)

Three commands report how squad players map to real World Cup fixtures in the
current fantasy round:

| Command | What it shows |
|---------|---------------|
| `/team-round-utilization` | All 15 players on one team — national-team fixture, played vs upcoming, round points |
| `/league-round-utilization <league>` | Per fantasy team in a league: how many players already played vs still waiting |
| `/league-watchlist <league>` | Upcoming fixtures where at least one league player is involved |

Pass a league name substring (e.g. `כצים`) or `leagueId`. League-wide tools fetch
every squad in the league (capped at 50 teams — intended for private leagues, not the
overall Sport5 league). Nation names are matched from Sport5 Hebrew to TheSportsDB
English via a built-in alias table; per-player points during an in-progress round
depend on Sport5 updating `lastRoundPoints` after each nation match.

## Key game concepts it encodes

- **Squad**: 15 players — a starting XI (1 GK, 3–5 DEF, 3–5 MID, 1–3 FWD) plus a
  4-player bench (exactly one of each position).
- **Captain** scores ×2; **vice** is promoted if the captain doesn't play.
- **Per-stage limits** tighten and loosen as the tournament progresses: budget rises
  120M → 135M, the max-players-per-nation cap rises 2 → 9, transfer allowances change.
- **Four bonus chips**, each usable once all season: Triple Captain, 5 Substitutions,
  Double Captains, All-Squad Points.

All of this lives in `mcp-server/src/rules.ts` and is exposed via the `get_game_rules`
tool, so the advice is always checked against the real constraints.

## Privacy

Your cookie stays on your machine, passed to the MCP server via an environment
variable. It is never committed, logged, or sent anywhere except Sport5's own API.
