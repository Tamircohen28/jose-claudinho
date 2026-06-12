# Scoring & Constraints Reference

The authoritative source is the game's terms (`fantasywc-sport5-terms-and-conditions.md`)
and the `get_game_rules` MCP tool (which returns this machine-readable per stage).
This file is the human-readable cheat sheet for reasoning.

## Squad shape (always 15 players)

- **Starting XI (11):** exactly 1 GK; 3–5 DEF; 3–5 MID; 1–3 FWD. Must total 11.
  Legal formations include 3-5-2, 3-4-3, 4-5-1, 4-4-2, 4-3-3, 5-4-1, 5-3-2, 3-5-2, etc.
- **Bench (4):** exactly **one GK, one DEF, one MID, one FWD** — never two of a
  position. The bench is part of the budget.
- **Captain** scores ×2 (including negative points). **Vice-captain** is promoted
  to captain (×2) automatically, one-time, only if the captain does not play at all.

## Auto-substitution

If a starter does not play, the system subs in the bench player **of the same
position**. Because there is only one bench player per position, only the *first*
non-playing starter in a given position can be covered; a second no-show in that
position scores nothing. Bench players otherwise score nothing (unless the
All-Squad Points chip is active).

## Per-stage limits (CHANGE BY STAGE — always confirm with get_game_rules)

| Stage         | Budget | Max players / national team | Transfers this round |
|---------------|--------|-----------------------------|----------------------|
| Group stage   | 120M   | 2                           | 3 per round          |
| Round of 32   | 120M   | 2                           | 3 (unlimited in the pre-stage window) |
| Round of 16   | 125M   | 3                           | unlimited in pre-stage window |
| Quarter-final | 125M   | 4                           | 5                    |
| Semi-final    | 130M   | 7                           | 6                    |
| Final         | 135M   | 9                           | 7                    |

- Before round 1: unlimited transfers. Transfers cannot be carried over.
- Transfers and captain changes lock **30 minutes before the round opens**.
- Points already earned by a sold player are kept.

## Scoring table

**Minutes**
- Played < 60 min: **+1**
- Played ≥ 60 min: **+2** (stoppage time excluded; extra time counts)

**Goals (by scorer position)**
- GK: **+7** · DEF: **+6** · MID: **+5** · FWD: **+4**
- Multi-goal bonus: brace **+1**, hat-trick **+2**, four **+3**, … (n goals → n−1 bonus)

**Other attacking**
- Assist: **+3**
- Won a penalty: **+2**

**Defensive**
- GK clean sheet (played ≥60): **+4**
- DEF clean sheet (played ≥60): **+4**
- GK/DEF conceding: the 1st goal cancels the clean-sheet bonus; from the 2nd
  goal onward **−1 per goal**.
- GK saved a penalty (only if it was stopped/parried): **+4**

**Penalties / negatives**
- Caused a penalty (incl. handball): **−4**
- Missed a penalty: **−4**
- Own goal: **−5**
- Yellow card: **−1**
- Two yellows → red: **−3**
- Straight red: **−3**
- Yellow + direct red: **−4**

Penalty shootouts after extra time do **not** count.

## Bonus chips (each usable once for the whole season)

> `bonusId` → chip mapping is **verified** against the game config
> (`Leagues/Get → sportTypeBasicConfig.bonusTypes`). API enum names in brackets.

1. **Triple Captain** (`bonusId 1`, `TripleCaptain`) — captain scores ×3 for one round.
2. **5 Substitutions** (`bonusId 2`, `ElevenSubs`) — make 5 transfers (instead of 3)
   in one chosen round (`allowedSubsInSubsBonus = 5`).
3. **Double Captains** (`bonusId 3`, `CaptainAndSubDouble`) — captain AND vice both
   score double for one round. Stacks with Triple Captain (captain ×3, vice ×2).
4. **All-Squad Points** (`bonusId 4`, `BenchScore`) — all 15 players (XI + bench)
   score for one round.

## Validation checklist (run before presenting any plan)

- [ ] Squad has exactly 15 players (11 starters + 4 bench).
- [ ] Starting XI: 1 GK, 3–5 DEF, 3–5 MID, 1–3 FWD, total 11.
- [ ] Bench: exactly 1 GK + 1 DEF + 1 MID + 1 FWD.
- [ ] No national team contributes more players than the stage cap allows.
- [ ] Total squad cost ≤ stage budget.
- [ ] Number of transfers ≤ transfers allowed this stage (or a transfer chip covers it).
- [ ] Captain and vice are two different players, both likely to start.
- [ ] No injured/expelled/missing/eliminated player is in the starting XI.
- [ ] Any chip recommended is unused and justified.
