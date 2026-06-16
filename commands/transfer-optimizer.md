# /transfer-optimizer

Run the mathematically-grounded transfer and lineup optimizer for the upcoming Fantasy WC round.

**Skill:** `transfer-optimizer`

**Allowed MCP tools:**
- `get_game_rules`
- `sport5_get_my_team`
- `worldcup_fixtures`
- `sport5_list_players`
- `compute_squad_ev`
- `rank_transfer_candidates`
- `predict_bracket_matchups`
- `list_snapshots`
- `analyze_ownership`
- `sport5_get_my_leagues`

## What it does

Executes the 12-step transfer optimizer procedure from `skills/transfer-optimizer/SKILL.md`:

1. Loads current stage rules and transfer allowances
2. Fetches your current 15-player squad
3. Maps each player's national team to upcoming World Cup fixtures
4. Computes expected value (EV) for all squad players via the scoring engine
5. Identifies players with no fixtures or poor EV to sell
6. Scans the market for high-EV replacements within budget + constraints
7. Runs `rank_transfer_candidates` to get feasible swaps sorted by EV gain
8. Selects optimal captain and vice-captain from EV rankings
9. Evaluates all four bonus chips against EV benchmarks
10. Validates all constraints (budget, team cap, formation, bench shape)
11. Presents a structured recommendation with full EV rationale

## Arguments

None required. The optimizer reads everything from your connected team (cookie needed for squad/league data).

Optional context you can provide inline:
- `stage=r16` — override the auto-detected stage
- `fixtures_only` — skip transfers, only update captain/chip recommendation

## Example output

```
## 🔢 Transfer Optimizer — Round 4 · Round of 16

### Transfers (3 available)
| # | OUT | IN | EV Gain | Budget Δ |
|---|-----|----|---------|----------|
| 1 | Militão (DEF, 8.5M) | Upamecano (DEF, 7.5M) | +2.4 pts | −1.0M |
| 2 | Salah (MID, 13M) | Bellingham (MID, 12.5M) | +1.8 pts | −0.5M |

### Starting XI — 4-3-3
⭐ Captain: Vinicius Jr — EV 7.2 → 14.4 as captain
...
```
