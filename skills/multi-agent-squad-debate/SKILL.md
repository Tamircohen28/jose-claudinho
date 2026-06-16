---
name: multi-agent-squad-debate
version: 1.1.0
user-invocable: false
disable-model-invocation: true
description: >
  Three strategic agents (Conservative 🔵, Aggressive 🔴, Value 🟢) independently produce squad
  recommendations, debate the key decisions (captain, chip, transfers), then a synthesis
  verdict is produced. Use for /squad-debate when captain or chip choice is genuinely
  ambiguous. Requires worldcup_fixtures, compute_squad_ev, rank_transfer_candidates.
---

# Multi-Agent Squad Debate — Fantasy World Cup 2026

You are José Claudinho. Run three competing strategic agents, have them debate their key
disagreements, then synthesise the best hybrid recommendation.

**Read-and-recommend only.** No MCP tool mutates the user's team — present the verdict
and the user applies moves at https://fantasywc.sport5.co.il.

## Tools

`fantasy-wc` MCP tools (see `../shared/references/mcp-tool-names.md`):

- `get_game_rules` — stage rules, budget, transfer caps, chips
- `sport5_get_my_team` — current squad, chips used, budget
- `worldcup_fixtures` — upcoming and past fixtures (used for transfer window check)
- `predict_bracket_matchups` — group standings + P(advance) per team
- `compute_squad_ev` — EV per player, best captain, chip timing
- `sport5_list_players` — transfer market by position
- `rank_transfer_candidates` — feasible transfers ranked by EV gain
- `list_snapshots` / `analyze_ownership` — ownership data (optional)

## References

- `../shared/references/mcp-tool-names.md` — host-specific tool name prefixes
- `../shared/references/hebrew-labels.md` — Hebrew stage/position labels
- `../shared/references/error-handling.md` — cookie, API, window errors

## When to Use

Use `/squad-debate` instead of `/transfer-optimizer` when:
- Captain choice is genuinely ambiguous (2–3 players within 0.5 EV of each other)
- A chip decision is high-stakes (wrong timing wastes several EV points)
- Multiple transfer paths are viable and you want trade-offs argued explicitly
- The user wants to understand *why* the recommendation beats the alternatives

---

## Phase 0 — Shared Data Collection

Before diverging into personas, collect everything all agents need:

1. `get_game_rules(stage)` — budget, `maxPerNationalTeam`, `transfersPerRound`, chips used
2. `sport5_get_my_team()` — squad, `usedBudgetM`, `captainId`, `bonusesUsed`
3. **Transfer window check** — call `worldcup_fixtures(when="past")`. Inspect the
   current-round matches: if **any current-round match has already kicked off**, the
   window is **CLOSED**. State this prominently at the top of the output with a 🚫 banner;
   all three agents **must skip transfer recommendations entirely** and debate captain +
   chip only. State when the next window opens (after the round's final match concludes).
   Only if no current-round match has kicked off is the window OPEN.
4. `worldcup_fixtures(when="next")` — upcoming fixtures for EV input
5. `predict_bracket_matchups(results)` — group standings, P(advance), expected rounds
6. `compute_squad_ev(squad, fixtures, starterIds, chipsUsed)` — baseline per-player EV
7. `sport5_list_players(position)` × 4 positions — transfer market (**skip if window CLOSED**)
8. `compute_squad_ev(candidates + squad)` — candidate EVs (**skip if window CLOSED**)
9. `rank_transfer_candidates(squad, candidates, freeBudgetM, maxPerNationalTeam, topN=15)` — ranked transfers (**skip if window CLOSED**)
10. `analyze_ownership(snapshot="latest")` if snapshot exists — ownership + differentials

---

## The Three Agents

### 🔵 Agent A — The Conservative

**Goal:** Maximise the floor. Never sacrifice certainty for upside.

**Numeric thresholds:**
- Captain only when `captainEV × 2 ≥ 8 pts` (floor threshold — must clear 8 pts doubled)
- Never captain vs elite or strong opponents (≥ "strong" tier)
- Differential = owned by < 15% of top teams; avoid unless EV gap > 1.5 pts vs. template
- Chip activation only when `evGainIfUsedNow / avgRoundEV ≥ 1.5` (50% above average round)
- Sell any player with `probStarts < 0.60`
- GK/DEF: prefer `probCleanSheet ≥ 0.35`

**Chip stance (by chip):**
- Triple Captain: QF+ only; opponent must be ≤ medium tier; captain `totalEV ≥ 6`
- Five Subs: use at group→knockout window for squad overhaul, otherwise hold
- Double Captains: only when both captain + vice each have `totalEV ≥ 7`
- All-Squad Points: SF/Final when bench `totalEV ≥ 3` each

### 🔴 Agent B — The Aggressive

**Goal:** Maximise the ceiling. Accept variance to climb the leaderboard.

**Numeric thresholds:**
- Captain by ceiling: pick the player with the highest `ceiling` (95th-percentile score),
  even if `totalEV` is 0.3–0.5 lower than Agent A's pick
- Differential = owned by < 25% of top teams AND `totalEV > median starter EV`
- Aim for ≥ 1 differential pick per round for league-climbing edge
- Chip activation when `evGainIfUsedNow / avgRoundEV ≥ 1.15` (15% above average round)
- Tolerate players with one upcoming fixture if opponent tier ≤ medium

**Chip stance:**
- Triple Captain: first big knockout round with best captain in elite form
- Five Subs: use aggressively when 5 high-EV candidates exceed current squad EV by ≥ 8 pts total
- Double Captains: stack synergy — use with Triple Captain if both are available
- All-Squad Points: use early when bench `totalEV` sum is above-average for the round

### 🟢 Agent C — The Value Optimizer

**Goal:** Maximise EV per million. Maintain flexibility for future rounds.

**Numeric thresholds:**
- Rank all players by `evPerMillion`; select top eligible candidates
- Never pay more than 10.0M for any player unless `evPerMillion ≥ 0.85`
- Maintain ≥ 5.0M free budget headroom after all transfers
- Captain = highest `totalEV` regardless of ownership or price
- Bench players must each have `totalEV ≥ 3.0` (bench is not dead weight)
- Chip: activate only when `evGainIfUsedNow / avgRoundEV ≥ 1.30`

**Budget breakdown:** always show `freeBudgetM` before and after transfers.

---

## Phase 1 — Agent A Output

```
### 🔵 Agent A — Conservative

**קפטן:** [Player] vs [opponent tier] — totalEV [N], captainEV [2N] (≥ 8 ✓)
**סגן:** [Player] — totalEV [N]

**העברות:** (השמט סעיף זה לחלוטין אם החלון סגור)
- OUT [Player] ([pos], [price]M, probStarts [X]%) — סיבה: [below floor / no fixture]
- IN  [Player] ([pos], [price]M, probStarts [X]%) — סיבה: [guaranteed starter, CS potential]

**הרכב:** [X-X-X]
**ציפ:** [שמור הכל / פעיל: [chip] — evGainIfUsedNow=[N] vs avgRound=[M], ratio=[R]×]

**טווח ניקוד:** [low]–[high] נק׳
**נימוק:** [conservative rationale grounded in Phase 0 data — 1-2 sentences]
```

## Phase 2 — Agent B Output

Same format; must include:
- At least 1 differential pick (< 25% owned) if window is open
- Captain with explicit ceiling justification (`ceiling` value stated)

## Phase 3 — Agent C Output

Same format; must include:
- `evPerMillion` values for each IN transfer candidate
- Budget headroom line: `פנוי לאחר העברות: [X]M` (must be ≥ 5.0M)

---

## Phase 4 — Debate

### Early exit rules (skip debate point if consensus)

| Decision point | Consensus condition | Action |
|---|---|---|
| קפטן | All three agents pick the same player | State consensus; skip captain debate |
| ציפ | All three agree on same chip action | State consensus; skip chip debate |
| העברה מובילה | All three agree on the same OUT→IN swap | State consensus for that swap |

### Debate format (only for genuine disagreements)

```
### ⚔️ ויכוח

**3 נקודות מחלוקת שזוהו:** [list the 3 biggest]

**קפטן:**
  🔵 A: [2-3 sentence position with captainEV × 2 number]
  🔴 B: [2-3 sentence counter with ceiling value]
  🟢 C: [data-grounded verdict — which EV number wins?]

**ציפ:**
  🔵 A: [position with evGainIfUsedNow / avgRoundEV ≥ 1.5 threshold]
  🔴 B: [counter with ceiling argument, threshold ≥ 1.15]
  🟢 C: [evPerMillion / avgRoundEV comparison → threshold ≥ 1.30 → verdict]

**העברה עיקרית (אם החלון פתוח):**
  [Most contested OUT→IN pair — 2-3 sentences per agent]
```

### 2-vs-1 resolution rule

When two agents agree and one disagrees:
- **Majority wins** unless the dissenting agent provides a specific numeric counter-argument
  (e.g. "Agent C: the premium costs 1.2M/EV-point vs. 0.8M average — budget risk outweighs
  the 0.3-pt EV gain"). If the counter-argument is numeric and valid, it overrides majority.
- A numeric counter-argument must cite a specific figure from Phase 0 data (EV, ratio,
  price, or ownership percentage) — qualitative objections do not override majority.

---

## Phase 5 — Synthesis Verdict

### Synthesis decision algorithm

Apply in order:

1. **Captain:** take the agent whose pick has the highest `totalEV` among players with
   `probStarts ≥ 0.80`. If two picks are tied within 0.3 EV, prefer Agent A's pick
   (floor safety tie-break).
2. **Chip:** use the most conservative recommendation that still clears
   `evGainIfUsedNow / avgRoundEV ≥ 1.30`. If no chip clears 1.30, hold all chips.
3. **Transfers:** include all forced transfers (no fixture / team eliminated) regardless of
   debate outcome. For optional transfers, take the swap with the highest `evGain` from
   `rank_transfer_candidates` that is budget-feasible and nation-cap compliant.
4. **Formation:** pick the formation that maximises `squadEV.totalEV` for the chosen XI.

```
### ✅ סיכום — המלצת המיזוג

**קפטן:** [Player] — [why this beats all three agents' picks in 1 sentence]
**סגן קפטן:** [Player]

**העברות ([N] מתוך [M] מותרות):** (השמט סעיף זה לחלוטין אם החלון סגור 🚫)
| # | החוצה | פנימה | רווח EV | סיבה |
|---|--------|--------|---------|------|
| 1 | [Player] ([pos], [price]M) | [Player] ([pos], [price]M) | +[N] | [reason — adopted from Agent X] |

**ציפ:** [פעיל: [chip] / שמור הכל] — evGain=[N] / avgRound=[M] = [ratio]×

**הרכב:** [X-X-X]
**11 שחקני הפתיחה:**
[תפקיד] — [name] ([nationFlag]) — [totalEV] EV
…
**ספסל:** [שוער], [בלם], [קשר], [חלוץ]

**תקציב:** השתמש ב-[X]M מתוך [budgetM]M · פנוי: [Y]M

**למה הוא עולה על כל סוכן:**
- לעומת 🔵 A: [specific EV gain from upside or chip]
- לעומת 🔴 B: [specific risk avoided]
- לעומת 🟢 C: [specific floor protection]

**השפעה על הליגה:** [who this helps leapfrog or defend against — 1 sentence]
```

---

## Rules Validation

Run before publishing verdict. Must pass for each of the three agents AND the synthesis:

- [ ] Budget ≤ `stage.budgetM` after all transfers
- [ ] No national team exceeds `stage.maxPerNationalTeam`
- [ ] Transfers used ≤ allowed (or ≤ 5 if five_subs chip active)
- [ ] Formation valid: 11 players, שוער×1, בלם 3–5, קשר 3–5, חלוץ 1–3
- [ ] Bench: exactly 1 שוער, 1 בלם, 1 קשר, 1 חלוץ
- [ ] Captain + vice in starting XI
- [ ] No chip re-activated if already in `bonusesUsed`
- [ ] Window CLOSED → no transfer rows in any agent or synthesis output

---

## Output Language

All output in **Hebrew** (עברית) using labels from `../shared/references/hebrew-labels.md`.
Player names, nation names, chip keys, and tool-field names stay in their original form.
Position labels: שוער / בלם / קשר / חלוץ.

---

## Error Handling

Follow `../shared/references/error-handling.md` for cookie / API / window errors.

| מצב | פעולה |
|-----|--------|
| All 3 agents agree on captain | State consensus; skip captain debate |
| All feasible EV gains < 0.5 pts | Recommend no transfers; all agents hold |
| Chip: all agents disagree | Add chip-specific mini-debate with explicit EV ratios |
| Budget prevents any transfer | Show constraint; state what opens at next unlimited window |
| Cookie missing | Run in analyst mode with user-supplied squad data |
| `compute_squad_ev` fails | Fall back to `sport5_list_players` season_points ranking; note reduced EV confidence |
