# /squad-debate

Run the multi-agent squad strategy debate: three competing agents each propose a lineup, debate the key decisions, and the model synthesises the optimal hybrid recommendation.

**Skill:** `multi-agent-squad-debate`

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
- `sport5_get_league_table`

## What it does

Runs the full multi-agent debate procedure from `skills/multi-agent-squad-debate/SKILL.md`:

1. **Phase 0:** Collects shared data (rules, squad, fixtures, EVs, market, ownership)
2. **Agent A — Conservative 🔵:** Recommends the lowest-risk squad (high floor, safe captain, hold chips)
3. **Agent B — Aggressive 🔴:** Recommends the highest-upside squad (differentials, chip deployment, ceiling captain)
4. **Agent C — Value 🟢:** Recommends the best EV-per-million squad (efficiency, budget headroom)
5. **Debate:** Each agent critiques the other two on captain, chip timing, and key transfers
6. **Synthesis:** Final hybrid recommendation that outperforms all three individual stances, with explicit EV comparison

## When to use over /transfer-optimizer

Use `/squad-debate` when:
- Captain choice is ambiguous between 2-3 similar players
- A chip decision is irreversible and high-stakes
- You want to understand the trade-offs, not just the answer
- Multiple valid transfer paths exist and you want the best one defended

## Output

Full Hebrew-language debate output with:
- Three independent squad proposals (EN player names, HE prose)
- Point-by-point debate on captain, chip, and top transfer
- Synthesised final verdict with explicit comparison to each agent
- Constraint validation checklist
