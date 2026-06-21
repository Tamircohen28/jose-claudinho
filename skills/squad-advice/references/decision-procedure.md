# Worked Example — A Group-Stage Round

This illustrates the procedure end to end. Numbers are illustrative.

## 1. Stage & rules
`get_game_rules{stage:"group"}` → budget 120M, max 2 per nation, 3 transfers/round.

## 2. Current team
`sport5_get_my_team` →
- Formation 4-4-2, 120M used (0 free), captain Haaland, vice De Bruyne.
- `playersPerNationalTeam`: Germany 2, Belgium 1, Netherlands 1, …
- Chips used: none.

## 3. Availability & eliminations
- `worldcup_fixtures{when:"past"}` shows Player X's nation lost both matches and is
  out → his points are now zero. Sell candidate.
- One owned DEF is `injured:true`. Sell candidate.

## 4. Fixtures
`worldcup_fixtures{when:"next"}` → strong attacking sides with good matchups this
round: France, Spain, England. Bias transfers toward their nailed starters.

## 5. Learning data
- `list_snapshots` → none for this round.
- `snapshot_top_teams{topN:50}` → captures 50 squads + market.
- `analyze_ownership{snapshot:"latest"}` →
  - Most owned FWD: Mbappé 78%, Kane 64%.
  - Top captain: Mbappé 41%.
  - Best value: a 6.5M MID averaging 7 pts (10.8 pts/M).
  - Differential: a 7M FWD on 9 pts owned by only 8% of top teams.

## 6. Candidate transfers (max 3)
With the injured DEF and the eliminated player to remove, and 1 spare transfer:
- OUT injured DEF (8.0M) → IN a nailed 7.5M DEF from a clean-sheet-likely side (+0.5M freed).
- OUT eliminated X (9.0M) → IN the 6.5M value MID (frees 2.5M, fixes budget headroom).
- Spare transfer: OUT a 5M bench filler → IN the 7M differential FWD using freed budget,
  IF the per-nation cap and budget still pass.

Check after each: per-nation ≤ 2, total ≤ 120M.

## 7. Captain
Consensus is Mbappé (41% of top teams, great fixture, nailed 90 min). Following the
template here is correct — captaining the field's pick avoids falling behind if he
hauls. If the user is chasing in a small league, a lower-owned captain with a great
fixture is the higher-variance play.

## 8. Lineup / bench
- Start the 11 best expected scorers in a legal 4-4-2.
- Bench order: a GK, a DEF, a MID, a FWD — the four lowest expected, each a real
  same-position cover for a possible no-show.

## 9. Chips
Hold all four. No standout double-fixture or single-haul case this round.

## 10. Validate
Run the checklist in `scoring-and-constraints.md`. All pass → present.

## Presentation (what the user sees)

> **Transfers (3/3):**
> - OUT [injured DEF] 8.0M → IN [nailed DEF] 7.5M — injury cover + clean-sheet upside.
> - OUT [eliminated FWD] 9.0M → IN [value MID] 6.5M — frees 2.5M, 10.8 pts/M.
> - OUT [bench filler] 5.0M → IN [differential FWD] 7.0M — 9 pts, only 8% owned.
> Net spend −1.0M → 1.0M in the bank.
>
> **Captain:** Mbappé (consensus, nailed, top fixture). **Vice:** Kane.
> **XI (4-4-2):** GK …; DEF …×4; MID …×4; FWD Mbappé, Kane.
> **Bench:** GK …, DEF …, MID …, FWD …
> **Chips:** hold all.
> **Watch-outs:** transfer deadline 30 min before the first kickoff.
