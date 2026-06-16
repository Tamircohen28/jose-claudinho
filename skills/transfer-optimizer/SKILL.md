# transfer-optimizer — Fantasy WC Transfer & Lineup Optimizer

**Version:** 1.0.0
**User-invocable:** false (model-driven; triggered by `/transfer-optimizer`)

---

## Purpose

Produce a mathematically grounded transfer and lineup recommendation for the upcoming Fantasy World Cup round. The output includes:

- Which players to sell and buy (ranked by expected value gain)
- Optimal captain / vice-captain pick with EV justification
- Formation and bench order
- Which bonus chip (if any) to activate this round
- Complete constraint validation against current stage rules

---

## Mathematical Foundation

All recommendations are built on **Expected Value (EV)** — the probability-weighted number of Fantasy points a player is expected to score:

```
EV(player) = Σ_event  P(event) × points(event)
```

Key components per fixture:
| Component | Driver |
|-----------|--------|
| Minutes EV | P(starts) × P(60+ min) × 2 + P(sub) × 1 |
| Goal EV | E[goals] × goal_pts[position] |
| Multi-goal bonus | ≈ E[goals]² / 2 |
| Assist EV | E[assists] × 3 |
| Clean sheet EV (GK/DEF) | P(CS) × P(played 60+) × 4 |
| Conceded penalty (GK/DEF) | −E[goals beyond 1st] per 60+ min |
| Card EV | P(yellow)×(−1) + P(red)×(−3) |
| Penalty EV | P(cause)×(−4) + P(win)×2 + P(GK save)×4 |
| Own goal EV | P(OG)×(−5) |

Fixture difficulty is tiered:
- **elite** = Brazil, France, Argentina, England, Spain (xGAgainst ≈ 2.0)
- **strong** = Portugal, Netherlands, Germany, Belgium, Uruguay
- **medium** = USA, Japan, Morocco, Mexico, Switzerland
- **weak** = remaining group-stage opponents

Captain/chip multipliers applied last:
- Regular captain: EV × 2
- Triple Captain chip: EV × 3
- Double Captains chip: captain EV × 2 + vice EV × 2
- All-Squad Points chip: add bench EV to total

---

## 12-Step Procedure

### Step 1 — Establish Stage & Rules

Call `get_game_rules` with the current stage.

Extract:
- `stage.budgetM` — total budget available
- `stage.maxPerNationalTeam` — team cap this stage
- `stage.transfersPerRound` — how many changes allowed
- `stage.transferWindowNote` — is the unlimited window open?
- All four bonus chips and which are already used

### Step 2 — Load Current Squad

Call `sport5_get_my_team`.

Record:
- All 15 players: name, position, price, nationTeamId, isStarter
- `usedBudgetM`, remaining free budget = `stage.budgetM − usedBudgetM`
- `captainId`, `viceCaptainId`
- `bonusesUsed` — chips already spent

### Step 3 — Get Upcoming Fixtures

Call `worldcup_fixtures(when="next", limit=50)`.

For each national team in the squad:
- Identify upcoming fixture(s) this round
- Determine opponent name
- Derive opponent tier from group standings or prior knowledge

Also call `worldcup_fixtures(when="past", limit=100)` to feed into `predict_bracket_matchups` for the group standings and team advancement probabilities.

### Step 4 — Compute Squad EV

Call `compute_squad_ev` with:
- All 15 squad players
- Their upcoming fixtures with opponent tier
- `starterIds` = current starting XI
- `chipsUsed` = bonuses already spent
- `roundsRemaining` = estimated rounds left

Read back:
- `players[]` sorted by `totalEV`
- `squadEV.bestCaptainName` — who to captain
- `chips[]` — chip timing recommendations

### Step 5 — Audit Unavailable Players

Flag any squad player who:
1. Has **no upcoming fixture** (national team eliminated or bye)
2. Is marked unavailable (injured/suspended) in `sport5_list_players`
3. Is from a national team with 0 remaining rounds

These are the **forced transfer** candidates — replace them regardless of EV math.

### Step 6 — Load Transfer Market

Call `sport5_list_players` with relevant filters per position slot needing a transfer:
- Filter by `position`, `excludeUnavailable=true`
- Sort by `season_points` or `last_round_points`
- Limit to top 50 per position

For each candidate, derive upcoming fixture difficulty from their national team's schedule.

### Step 7 — Compute Candidate EV

Call `compute_squad_ev` again, now including transfer candidates alongside squad players, using their upcoming fixture tiers.

### Step 8 — Rank Transfers

Call `rank_transfer_candidates` with:
- Current squad players + their EVs
- Market candidates + their EVs
- `freeBudgetM`
- `maxPerNationalTeam`
- `topN=15`

Filter the results to the number of transfers allowed (`stage.transfersPerRound`).

If the **5 Subs chip** is available and recommended (from chip evaluation), you may extend to 5 transfers.

### Step 9 — Load Snapshot Intelligence (optional)

If a snapshot exists (`list_snapshots`), call `analyze_ownership` and note:
- **Differentials**: low-owned players with high EV → edge over the competition
- **Captain consensus**: if 80%+ of top teams captain the same player, consider captaining them or deliberately differentiating

### Step 10 — Select Captain & Vice-Captain

1. Take the `squadEV.bestCaptainName` from `compute_squad_ev`
2. Verify their fixture is **not** vs an elite opponent (adjust if necessary)
3. Vice: second-highest EV among starters
4. If chip `double_captains` is recommended: pick both captain and vice from the top-2 EV players

Captain selection hierarchy:
1. Highest-EV starter vs weakest opponent tier
2. Tie-break: highest `seasonPoints` (form proxy)
3. Avoid captaining any player with a red-card risk (recent bookings, aggressive style)

### Step 11 — Set Formation & Bench Order

Valid formations (must total 11):
- 4-3-3, 4-4-2, 3-5-2, 3-4-3, 5-3-2, 5-4-1, 4-5-1, 3-5-2

Bench auto-sub awareness:
- The system only auto-subs if a starter **doesn't play at all** and there's a bench player of the same position
- Place the **highest-EV bench player** in the sub-priority position if you expect starters to be rested
- Bench order doesn't matter for auto-subs (system uses same-position logic, not order)

### Step 12 — Validate & Present

Validation checklist before presenting:
- [ ] Total players = 15 (11 XI + 4 bench)
- [ ] Formation valid (within position min/max)
- [ ] Budget used ≤ `stage.budgetM`
- [ ] No national team has > `stage.maxPerNationalTeam` players
- [ ] Bench has exactly 1 GK, 1 DEF, 1 MID, 1 FWD
- [ ] Captain and vice-captain are in the starting XI
- [ ] Transfers made ≤ allowed (or ≤ 5 if five_subs chip active)
- [ ] Chip used is not already spent

---

## Output Format

```
## 🔢 Transfer Optimizer — Round [N] · [Stage Label]

### Transfers (N available)
| # | OUT | IN | EV Gain | Budget Δ | Reason |
|---|-----|----|---------|----------|--------|
| 1 | Player A (DEF, 7.5M) | Player B (DEF, 8.0M) | +3.2 pts | +0.5M | Better fixture (medium vs elite) |

### Starting XI — [Formation]
| Pos | Player | Nation | Fixture | EV | Captain? |
|-----|--------|--------|---------|----| ---------|
| GK  | ...    | ...    | vs X    | 4.1| — |
...
⭐ Captain: [Name] — [N] EV → [2N] as captain
🌟 Vice: [Name] — [N] EV

### Bench
| Pos | Player | Nation | Fixture | EV |
|-----|--------|--------|---------|-----|
...

### Budget
- Used: XXM / [stage.budgetM]M
- Free: YM

### Chip Recommendation
- [✅ USE NOW / ⏳ Hold] [Chip Name]: [rationale]

### Why This Lineup?
[2-3 sentence rationale explaining the key EV-driven decisions,
fixture matchups, and any differential picks vs. the league.]
```

---

## Error Handling

| Situation | Action |
|-----------|--------|
| No upcoming fixture for a player | Flag as "no fixture" — treat as EV=0 and highest sell priority |
| Budget insufficient for best transfer | Cascade to next-best feasible option |
| National team cap would be breached | Mark as infeasible; show next-best compliant option |
| Cookie missing | Skip `sport5_get_my_team`; present analysis with user-supplied squad data |
| Snapshot missing | Skip Step 9 (ownership); note in output |
