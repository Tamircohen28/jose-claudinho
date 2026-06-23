# Features Reference

Complete guide to every slash command, skill, and MCP tool in José Claudinho.

---

## Slash commands

All commands are user-invoked only (`disable-model-invocation: true`). Run them by typing the
slash command in your AI host; they do not auto-fire from plain messages.

### `/fantasy-setup`

**First-time setup and connection verification.**

Walks you through setting `SPORT5_COOKIE`, verifies the connection to Sport5, and confirms
the MCP server is running. Run this before anything else.

```text
/fantasy-setup
```

What it does:
- Checks whether `SPORT5_COOKIE` is set in the environment.
- Calls `sport5_get_my_team` to verify the cookie is valid and not expired.
- Reports the MCP server version and available tools.
- Prints step-by-step instructions to refresh the cookie if needed.

---

### `/snapshot-league`

**Capture this round's top teams and market for learning.**

Run once per round, ideally at the start of the round before transfers close.

```text
/snapshot-league
```

What it does:
- Calls `snapshot_top_teams` — fetches the top-N teams in Sport5 (by total points) and the
  full player market, then writes a timestamped JSON snapshot to `~/.fantasy-wc-mcp/data/`.
- Each snapshot stores: team squads, captains, chips used, and player prices/ownership.
- `analyze_ownership` reads the accumulated snapshot history to identify most-owned players,
  popular captains, best points-per-million, and **differentials** (high-scoring but low-owned).

The more rounds you snapshot, the richer the ownership analysis. After the tournament ends,
all snapshots stay on disk as a season log.

---

### `/squad-advice [stage]`

**The main weekly recommendation — transfers, captain, XI, bench, chips.**

```text
/squad-advice          # auto-detects current stage
/squad-advice gs       # force group stage rules
/squad-advice r32      # round of 32
/squad-advice r16      # round of 16
/squad-advice qf       # quarter-finals
/squad-advice sf       # semi-finals
/squad-advice f        # final
```

The skill runs a 10-step procedure:

| Step | What happens |
|------|-------------|
| 1 | Pull stage rules — budget, per-nation cap, transfer allowance |
| 2 | Read your team — current XI, bench, captain, remaining budget |
| 3 | Check WC fixtures — who plays this round, who is eliminated |
| 4 | Monte Carlo bracket simulation (N=500) — per-team stage probabilities |
| 5 | Fetch lineup predictions and injury/suspension data |
| 6 | Compute per-player EV with lineup-confidence-adjusted rates, rank transfer candidates, run MILP optimizer |
| 7 | Analyze ownership — most-owned, best value, differentials |
| 8 | Draft the transfer plan, captain and vice, XI and bench |
| 9 | Compute league-win probability, determine strategy mode, evaluate chips |
| 10 | Validate the full plan against the hard constraint checklist |

**Output:** a concrete plan you apply yourself in the app — transfers (in/out, cost), captain,
vice-captain, starting XI by formation, bench order, chip recommendation, and strategy mode
(conservative / balanced / aggressive).

**The MILP optimizer (Step 6):** after building a shortlist of transfer candidates,
`optimize_squad` runs a Mixed Integer Linear Program that jointly picks the best squad, XI,
bench, and captain under all constraints simultaneously. It returns the highest-EV legal
squad and an exact transfer list. If the solver finds no feasible solution, the skill falls
back to a greedy manual approach.

**League strategy mode (Step 9):** `compute_league_win` calculates P(beat each rival) using
a normal approximation, derives a league-win probability, and emits a strategy mode:
- `conservative` — you are leading comfortably with ≤2 rounds left; copy template captain,
  avoid risky differentials.
- `balanced` — standard approach; balance EV floor and ceiling.
- `aggressive` — you are trailing; prioritise ceiling over floor, favour high-variance chips
  (Triple Captain, Double Captains).

---

### `/squad-debate`

**Three AI managers debate your squad options, then synthesise a verdict.**

```text
/squad-debate
```

Three independent agents each build a case for a different strategy (e.g. own the template,
go differential, or save the chip). A fourth agent synthesises the best elements into a
single recommendation. Good for a second opinion when `/squad-advice` leaves you uncertain.

---

### `/transfer-optimizer`

**Standalone EV-grounded transfer analysis.**

```text
/transfer-optimizer
```

Focused on the transfer decision only — does not produce a full squad plan. Uses
`rank_transfer_candidates` and `compute_squad_ev` to build an EV-ranked shortlist of
players to bring in for each player you might drop. Faster than a full `/squad-advice`
when you just want to evaluate one or two specific moves.

---

### `/team-round-utilization`

**Your squad: who has played vs who is still waiting this round.**

```text
/team-round-utilization
```

Calls `team_round_utilization` for your team. For each of your 15 players it shows:
- National team and opponent in this round
- Whether the match has been played or is still upcoming
- Points scored in this round (if played)

Useful mid-round to track whether your bench cover has already played before your starters.

---

### `/league-round-utilization [league]`

**Per-team utilization table for a private league.**

```text
/league-round-utilization כצים
/league-round-utilization 12345      # by leagueId
```

Shows every team in the league, ranked by total points, with a count of how many of their
15 players have already played this round vs are still waiting. Useful for spotting which
rivals are still exposed to upside (or downside) from remaining matches.

---

### `/league-watchlist [league]`

**Upcoming WC fixtures where at least one league player is involved.**

```text
/league-watchlist כצים
```

Filters the remaining fixtures this round to only those where a league manager has picks.
For each fixture it shows: match, kick-off time, and which managers own players from each
national team. Output is Hebrew-formatted.

---

### `/league-round-report [league]`

**Full league round report — recommended default.**

```text
/league-round-report כצים
```

Combines `/league-round-utilization` + `/league-watchlist` in one command. This is the
recommended command for a complete picture of a round in progress.

---

### `/league-next24h-matchups`

**WC matches in the next 24 hours with league ownership.**

```text
/league-next24h-matchups
```

Shows all World Cup matches kicking off in the next 24 hours, annotated with which managers
in your league own players from each national team. Good for a quick pre-match briefing.

---

## MCP tools reference

The skills call these tools automatically. Advanced users can call them directly via the MCP
interface for custom analysis.

### Data tools (Sport5 API)

| Tool | Auth | What it returns |
|------|------|----------------|
| `sport5_list_players` | Public | Full player market — all 1000+ players with name, nation, position, price, points, ownership |
| `sport5_get_my_team` | Cookie | Your current squad: XI, bench, captain, budget used, transfers remaining, chips used |
| `sport5_get_user_team` | Cookie | Any user's team by userId |
| `sport5_get_my_leagues` | Cookie | Your private leagues — name, leagueId, your rank, total teams |
| `sport5_get_league_table` | Cookie | League standings: rank, team name, total points, round points |

### Fixture and bracket tools

| Tool | Auth | What it returns |
|------|------|----------------|
| `worldcup_fixtures` | Public | WC 2026 group-stage fixtures (official 72-match schedule + TheSportsDB live scores); optional `round` 1/2/3 |
| `predict_bracket_matchups` | Public | Monte Carlo bracket simulation (N=500) — per-team stage probabilities, expected rounds remaining |

### Lineup and availability tools

| Tool | Auth | What it returns |
|------|------|----------------|
| `get_lineup_predictions` | Public | Predicted starting XIs for upcoming matches, with lineupConfidence per player |
| `get_player_availability` | Public | Injury and suspension status per player |

### Snapshot and ownership tools

| Tool | Auth | What it returns |
|------|------|----------------|
| `snapshot_top_teams` | Cookie | Captures top-N teams + market to a local JSON snapshot |
| `list_snapshots` | — | Lists all stored snapshots by date |
| `analyze_ownership` | — | Reads snapshot history: most-owned, popular captains, points-per-million, differentials |

### EV and optimization tools

| Tool | Auth | What it returns |
|------|------|----------------|
| `compute_squad_ev` | — | Per-player Expected Value, accounting for fixtures, lineup confidence, injury, and stage probabilities |
| `rank_transfer_candidates` | — | EV-ranked shortlist of transfer targets for each player you might drop |
| `optimize_squad` | — | MILP optimal squad/XI/bench/captain under all constraints |
| `compute_league_win` | — | P(beat each rival), league-win probability, strategy mode |

### Round utilization tools

| Tool | Auth | What it returns |
|------|------|----------------|
| `team_round_utilization` | Cookie | One team's players mapped to this round's fixtures — played/upcoming/points |
| `league_round_utilization` | Cookie | Full league utilization table — per-team played vs upcoming counts |
| `league_watchlist` | Cookie | Upcoming fixtures filtered to those with league picks |

### Config tool

| Tool | Auth | What it returns |
|------|------|----------------|
| `get_game_rules` | Public | Full encoded game rules for the requested stage — budget, caps, transfers, scoring table, chips |

---

## Engine internals

### Expected Value (EV)

`compute_squad_ev` decomposes a player's expected score into per-event probabilities:

- **pPlays** — probability the player features in the match at all
- **pPlays60** — probability of playing 60+ minutes (appearance bonus threshold)
- **goalShare** — player's expected fraction of their team's goals
- **assistShare** — similar for assists

These are combined with the fixture difficulty (based on opponent tier and advancement
probability), the match EV from the bracket simulator, and a form multiplier (0 = injured,
0.4 = doubtful, 1 = fit).

In v1.4.0, `pPlays`, `pPlays60`, and `goalShare` are **player-specific**: derived from
lineup-confidence data via `get_lineup_predictions`. A confirmed starter with high confidence
gets `pPlays ≈ 0.95`; a rotation risk with low confidence gets `pPlays ≈ 0.35`.

### MILP optimizer

`optimize_squad` uses the HiGHS WASM solver to solve a Mixed Integer Linear Program with:
- **Objective:** maximise total EV across all 15 squad slots (starter EV + bench EV × 0.35 + captain bonus)
- **Variables:** binary indicators for squad inclusion, starter status, bench slot, and captain
- **Constraints:** 11 starters, 4 bench, formation bounds (1 GK; 3–5 DEF; 3–5 MID; 1–3 FWD), budget, per-nation cap, captain-is-a-starter, transfer delta ≤ allowed

The solver returns an optimal or near-optimal solution in milliseconds.

### Monte Carlo bracket

`predict_bracket_matchups` simulates the tournament N=500 times. In each run:
1. Group stage advancement uses the current standings (points, GD, GF tiebreakers).
2. KO matches are sampled with `P(A wins) = sigmoid((strength_A − strength_B) × 0.4)`,
   clamped to [0.20, 0.80]. Strength is derived from group-stage points and goal difference.
3. The bracket is propagated round by round to the final.

Outputs are averaged across all runs: each team gets a probability for each stage
(pGroup, pR32, pR16, pQF, pSF, pFinal) and an expected number of rounds remaining.

### League-win probability

`compute_league_win` uses a normal approximation:

```
P(beat rival) = Φ((myEV − rivalEV) / σ_diff)
```

where `σ_diff = √(myVariance + rivalVariance)`. League-win probability is the product of
all per-rival win probabilities (assuming independence). The strategy mode is derived from
your rank, the score gap to the leader, and rounds remaining.

---

## Game rules encoded

All rules live in `mcp-server/src/rules.ts` and are exposed via `get_game_rules`:

| Concept | Encoded |
|---------|---------|
| Squad shape | 15 players: 11 starters (1 GK + 3–5 DEF + 3–5 MID + 1–3 FWD) + 4 bench (1 per position) |
| Captain | ×2 multiplier; vice promoted if captain doesn't play |
| Budgets | 120M (GS), rises to 135M by QF stage |
| Nation cap | 2 players max at GS; rises to 9 at final |
| Transfers | Varies by stage (typically 2 free; wildcards add more) |
| Scoring | Goals, assists, clean sheets, minutes, cards, penalties — full table |
| Chips | Triple Captain, 5 Substitutions, Double Captains, All-Squad Points — each once per season |
