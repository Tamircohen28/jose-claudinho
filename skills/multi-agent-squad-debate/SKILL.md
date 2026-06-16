# multi-agent-squad-debate — Multi-Perspective Squad Strategy Debate

**Version:** 1.0.0
**User-invocable:** false (model-driven; triggered by `/squad-debate`)

---

## Purpose

Run three competing strategic agents — Conservative, Aggressive, and Value — each independently producing a squad recommendation for the upcoming round. The agents then "debate" their positions, and the model synthesises the best hybrid recommendation, explaining why it beats each individual strategy.

This simulates the kind of multi-perspective decision-making used in professional fantasy sports analysis: each agent has a different risk/reward stance, and the debate surfaces trade-offs that a single analysis might miss.

---

## When to Use

Use `/squad-debate` instead of `/transfer-optimizer` when:
- The correct captain choice is genuinely ambiguous (2-3 players with similar EV)
- A bonus chip decision is high-stakes (wrong timing wastes significant EV)
- Multiple transfer paths are viable and you want to see trade-offs explicitly
- You want to understand **why** the recommended squad is better than the alternatives

---

## Three Agents

### 🔵 Agent A — The Conservative

**Philosophy:** Certainty above all. Maximise the floor, not the ceiling. Pick players who are guaranteed to play, from teams that always qualify deep, facing predictable opponents.

**Heuristics:**
- Only captain players with a ×2 expected score > 8 pts (high floor)
- Never captain vs. elite or strong opponents
- Prefer 3+ fixture players over single-fixture players
- Avoid differentials: stick to top-20% ownership players
- Save all chips for guaranteed high-EV moments in QF/SF/Final
- Prioritise clean-sheet potential (GK/DEF from teams with ≤1.0 xGA)
- Transfer out any player with < 60% chance of starting

**Chip stance:**
- Triple Captain: only with highest-EV captain vs. weak opponent in QF+
- Five Subs: use at the group-to-knockout transition window for squad rebuild
- Double Captains: only when both captain and vice have ≥ 7 pts EV each
- All-Squad Points: save for SF or Final when bench players guaranteed to play

### 🔴 Agent B — The Aggressive

**Philosophy:** High variance wins leagues. Target upside, differentials, and chips in concentration windows. Accept risk for the chance to jump 20 places in one round.

**Heuristics:**
- Captain based on **ceiling** not floor: scorer with potential hat-trick or 12+ pt upside
- Actively seek differentials: <30% owned players with > median EV
- Use chips early when the upside is clear — don't overthink
- Prefer high-priced premium FWDs and MIDs with scoring records
- Tolerate players with one upcoming fixture if the opponent is weak
- Aggressively chase ownership spikes before they happen (buy in early)

**Chip stance:**
- Triple Captain: use in the first big knockout round where the best captain has elite form
- Five Subs: use to make 5 high-upside transfers when the unlimited window closes
- Double Captains: stack with Triple Captain for maximum chip synergy
- All-Squad Points: use early when bench has great fixtures this round

### 🟢 Agent C — The Value Optimizer

**Philosophy:** Points per million is the true edge. Build maximum EV for the budget, maintain maximum free budget for future flexibility.

**Heuristics:**
- Sort all transfer candidates by `evPerMillion`; take the top eligible candidates
- Never pay more than 10M for any single player unless their EV/M > 0.9
- Maintain ≥ 5M free budget headroom at all times
- Captain based on pure `totalEV`, regardless of ownership or price
- Bench should have EV ≥ 3 per player (bench is budget, not dead weight)
- Use chips only when the mathematical EV gain is provably > the average round gain

**Chip stance:**
- All chips evaluated purely by `evGainIfUsedNow` vs. average round EV
- Only activate if `evGainIfUsedNow / avgRoundEV > 1.3` (30% above average)

---

## Execution Procedure

### Phase 0 — Shared Data Collection

Before diverging into agent personas, collect the shared context all agents need:

1. `get_game_rules(stage)` → rules, budget, transfers, caps
2. `sport5_get_my_team()` → current squad, bonuses used, budget
3. `worldcup_fixtures(when="next")` + `worldcup_fixtures(when="past")` → fixtures
4. `predict_bracket_matchups(results)` → group standings, team advancement P
5. `compute_squad_ev(squad + upcoming fixtures)` → baseline squad EV
6. `sport5_list_players(position, sortBy="season_points")` × 4 positions → market
7. `compute_squad_ev(candidates)` → candidate EVs
8. `rank_transfer_candidates(squad, candidates)` → feasible transfers ranked by EV
9. `analyze_ownership` (if snapshot exists) → ownership data

### Phase 1 — Agent A: Conservative Squad

Present Agent A's squad recommendation in this format:

```
### 🔵 Agent A — Conservative

**Captain:** [Player] vs [Opponent tier: weak/medium] — EV [N]
**Vice:** [Player] — EV [N]

**Transfers:**
- OUT [Player] (EV [N], reason: [no fixture / eliminated / low floor])
- IN [Player] (EV [N], reason: [guaranteed starter, clean sheet potential])

**Formation:** [X-X-X]
**Chip:** [None / Hold all / Use X if ...]

**Expected round score:** [Xpts range: low-high based on EV]
**Why:** [1-2 sentences on the conservative rationale]
```

### Phase 2 — Agent B: Aggressive Squad

Same format as Agent A, but with:
- At least one differential pick (< median ownership)
- Captain with maximum ceiling (may be vs. medium rather than weak)
- Chip usage if any chip is available and the upside is clear

### Phase 3 — Agent C: Value Squad

Same format, but with:
- All picks ranked by evPerMillion
- Budget breakdown showing headroom preserved
- Chip timing based on explicit EV-gain threshold

### Phase 4 — Debate Round

Each agent "responds" to the others' key decisions:

```
### ⚔️ Debate

**Agent A → Agent B:** [Critiques the aggressive differential pick and captain risk]
**Agent B → Agent A:** [Argues for upside, points out the conservative choice misses league gain]
**Agent C → both:** [Points out value mismatch — premium pick not justified by EV/M]
**Agent A → Agent C:** [Defends one premium pick where certainty justifies price]
```

Format: keep each exchange to 2-3 sentences. Focus on the 2-3 biggest points of disagreement.

Key debate points to address:
1. **Captain choice:** consensus or diverge? If all three agree → strong signal.
2. **Chip timing:** the most important strategic decision; debate must resolve it.
3. **Transfer priorities:** which player to sell first (forced vs. optional)?

### Phase 5 — Synthesis & Verdict

After the debate, present the final synthesised recommendation:

```
### ✅ Verdict — Synthesised Recommendation

After weighing all three perspectives:

**Captain:** [Winner] — [Why this beats the alternatives from the debate]
**Transfers (N of M allowed):**
- [Transfer 1] — adopted from [Agent X] because [reason]
- [Transfer 2] — adopted from [Agent Y] because [reason]
**Chip:** [Activate X / Hold all] — [EV justification from Phase 0 data]
**Formation:** [X-X-X]

**Why this beats each agent:**
- vs. Agent A: [gains N extra EV pts from upside pick / chip use]
- vs. Agent B: [avoids N pts downside risk from differential captain]
- vs. Agent C: [pays slight premium for certainty worth X extra pts on floor]

**League impact:** [If in private league: who specifically does this help leapfrog or defend against?]
```

---

## Rules Validation (apply before publishing verdict)

All three agents and the synthesis must pass these before output:

- [ ] Budget ≤ `stage.budgetM` after all transfers
- [ ] No national team exceeds `stage.maxPerNationalTeam`
- [ ] Transfers used ≤ allowed (or ≤ 5 if five_subs chip used)
- [ ] Formation is valid (11 players, GK×1, DEF 3-5, MID 3-5, FWD 1-3)
- [ ] Bench: exactly 1 GK, 1 DEF, 1 MID, 1 FWD
- [ ] Captain + vice-captain are in starting XI
- [ ] No chip marked as used is re-activated

---

## Output Language

All output in **Hebrew** (עברית), matching the convention of other skills in this repo. Player names, team names and chip keys remain in their English/original form. Use the `skills/shared/references/` Hebrew label glossary for standard terms.

---

## Error Handling

| Situation | Action |
|-----------|--------|
| Agents A and B agree on captain | Treat as strong consensus — no need to debate this point |
| All transfers feasible EV gains < 0.5 pts | Recommend no transfers this round (hold all) |
| Chip timing: all agents disagree | Run a fourth "chip-specific" mini-debate with explicit EV numbers |
| Budget constraint prevents any transfer | Present the constraint clearly; show what opens up at the next unlimited window |
| Cookie missing | Run in "analyst mode" with user-supplied current squad |
