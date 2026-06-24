/**
 * Mathematical Expected-Value (EV) engine for Fantasy World Cup 2026.
 *
 * All scoring constants come from rules.ts; this module adds the probabilistic
 * layer needed to compare players, fixtures, transfer options and chip timing.
 *
 * Approach
 * --------
 * For each upcoming fixture we model a player's expected points as:
 *
 *   EV = Σ_event  P(event) × points(event)
 *
 * Base rates are drawn from historical World Cup statistics and are adjusted
 * by fixture difficulty (opponent tier) and player recency form.
 */

import { SCORING, BONUS_CHIPS } from "./rules.js";

// ─── Opponent tier ────────────────────────────────────────────────────────────

/**
 * Coarse tier for a player's opponent.
 * Used to adjust xG, clean-sheet probability and win probability.
 *
 * Calibration (approx. xG from 2018/2022 WC group-stage data):
 *   elite  → Brazil, France, Argentina, England, Spain, Germany  (xGA ~0.9)
 *   strong → Portugal, Netherlands, Belgium, Uruguay, Italy       (xGA ~1.3)
 *   medium → USA, Mexico, Japan, Senegal, Morocco, Switzerland    (xGA ~1.5)
 *   weak   → most remaining group-stage sides                     (xGA ~2.0)
 */
export type OpponentTier = "elite" | "strong" | "medium" | "weak";

/** Per-player rate overrides to replace position-level constants. */
export interface PlayerRateOverrides {
  /** P(player starts and plays any minutes). Default: P_PLAYS (0.82) */
  pPlays?: number;
  /** P(plays ≥60 min | plays). Default: P_PLAYS_60 (0.73) */
  pPlays60?: number;
  /** Share of team xG attributed to this player. Default: GOAL_SHARE[pos] */
  goalShare?: number;
  /** Share of team xA attributed to this player. Default: ASSIST_SHARE[pos] */
  assistShare?: number;
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

/** Difficulty of one upcoming fixture from a player's perspective. */
export interface FixtureDifficulty {
  fixtureId?: string;
  opponent: string;
  tier: OpponentTier;
  /** P(player's team wins outright in 90 min + ET if played) */
  probWin: number;
  probDraw: number;
  probLoss: number;
  /** Expected goals scored by the player's team in this match */
  xGFor: number;
  /** Expected goals conceded by the player's team */
  xGAgainst: number;
  /** P(clean sheet) — used for GK/DEF scoring */
  probCleanSheet: number;
}

/** EV breakdown for a single player in a single fixture. */
export interface PlayerFixtureEV {
  fixtureId: string;
  opponent: string;
  minuteEV: number;
  goalEV: number;
  goalBonusEV: number;
  assistEV: number;
  cleanSheetEV: number;
  concededEV: number;
  cardEV: number;
  penaltyEV: number;
  ownGoalEV: number;
  subtotalEV: number;
}

/** Aggregated EV for a player over one or more upcoming fixtures. */
export interface PlayerEV {
  playerId: number;
  playerName: string;
  /** 1=GK 2=DEF 3=MID 4=FWD */
  position: number;
  price: number;
  fixtureCount: number;
  perFixtureEV: number;
  totalEV: number;
  /** totalEV × 2 (regular captain) */
  captainEV: number;
  /** totalEV × 3 (Triple Captain chip) */
  tripleCaptainEV: number;
  /** Points per million of price (efficiency ratio) */
  evPerMillion: number;
  fixtures: PlayerFixtureEV[];
}

/** EV summary for the whole 15-man squad. */
export interface SquadEV {
  totalStartingXIEV: number;
  totalBenchEV: number;
  totalSquadEV: number;
  /** Extra EV from using All-Squad Points chip (bench EV that would otherwise be 0) */
  allSquadChipExtraEV: number;
  /** Player id who maximises EV if given the captain armband */
  bestCaptainId: number;
  bestCaptainName: string;
  /** Extra EV gained by captaining this player instead of anyone else */
  bestCaptainEVGain: number;
  /** Player id who maximises EV under the Triple Captain chip */
  bestTripleCaptainId: number;
  bestTripleCaptainName: string;
  bestTripleCaptainEVGain: number;
  players: PlayerEV[];
}

/** A candidate transfer: swap player_out for player_in. */
export interface TransferCandidate {
  playerOutId: number;
  playerOutName: string;
  playerOutPosition: number;
  playerOutPrice: number;
  playerOutEV: number;
  playerInId: number;
  playerInName: string;
  playerInPosition: number;
  playerInPrice: number;
  playerInEV: number;
  /** Positive = candidate scores more; negative = downgrade */
  evGain: number;
  /** Positive = candidate costs more (reduces free budget) */
  budgetDelta: number;
  isFeasible: boolean;
  infeasibilityReason?: string;
  rationale: string;
}

/** Recommendation for when to use a specific chip. */
export interface ChipRecommendation {
  chipKey: string;
  chipLabel: string;
  alreadyUsed: boolean;
  recommendNow: boolean;
  /** Estimated extra points if used now vs. an average round */
  evGainIfUsedNow: number;
  rationale: string;
}

// ─── Base rates (calibrated to WC 2018 + 2022 data) ──────────────────────────

/** P(player participates in the match at all | they are in starting XI) */
const P_PLAYS = 0.82;
/** P(plays ≥ 60 min | plays any minutes) */
const P_PLAYS_60 = 0.73;

/** xG For player's team per game vs each opponent tier */
const XG_FOR: Record<OpponentTier, number> = {
  elite: 0.85,
  strong: 1.15,
  medium: 1.55,
  weak: 2.05,
};

/** xG Against player's team per game vs each opponent tier */
const XG_AGAINST: Record<OpponentTier, number> = {
  elite: 2.00,
  strong: 1.50,
  medium: 1.10,
  weak: 0.65,
};

/** P(clean sheet) vs each opponent tier */
const P_CLEAN_SHEET: Record<OpponentTier, number> = {
  elite: 0.09,
  strong: 0.18,
  medium: 0.28,
  weak: 0.40,
};

/** P(team wins in 90 min + ET) vs each opponent tier */
const P_WIN: Record<OpponentTier, number> = {
  elite: 0.14,
  strong: 0.28,
  medium: 0.44,
  weak: 0.62,
};

/**
 * Share of team xG attributed to this position.
 * Calibrated so GK+DEF+MID+FWD shares × xGFor ≈ historical per-position goal rates.
 */
const GOAL_SHARE: Record<number, number> = {
  1: 0.004, // GK
  2: 0.047, // DEF (set-pieces)
  3: 0.140, // MID
  4: 0.340, // FWD
};

/** Share of team assists attributed to this position */
const ASSIST_SHARE: Record<number, number> = {
  1: 0.004,
  2: 0.068,
  3: 0.175,
  4: 0.110,
};

/** P(yellow card per game | plays) */
const P_YELLOW: Record<number, number> = {
  1: 0.042,
  2: 0.135,
  3: 0.115,
  4: 0.080,
};

/** P(red card per game | plays) — includes straight reds and 2Y→R */
const P_RED: Record<number, number> = {
  1: 0.005,
  2: 0.016,
  3: 0.013,
  4: 0.008,
};

/** P(2Y→R specifically, out of all reds) */
const FRAC_TWO_YELLOW = 0.40;

/** P(cause a penalty per game | plays) */
const P_CAUSE_PENALTY: Record<number, number> = {
  1: 0.005,
  2: 0.018,
  3: 0.010,
  4: 0.005,
};

/** P(win a penalty per game | plays) */
const P_WIN_PENALTY: Record<number, number> = {
  1: 0.002,
  2: 0.006,
  3: 0.013,
  4: 0.024,
};

/** P(GK saves a penalty | a penalty is taken in the match) */
const P_GK_SAVES_PEN = 0.25;

/** P(a penalty kick is taken in a typical WC match) */
const P_PEN_IN_MATCH = 0.15;

/** P(own goal per game | plays) */
const P_OWN_GOAL: Record<number, number> = {
  1: 0.006,
  2: 0.010,
  3: 0.006,
  4: 0.003,
};

// ─── Fixture builder ──────────────────────────────────────────────────────────

/**
 * Build a FixtureDifficulty object from a named opponent tier.
 * For more accuracy, pass real xGFor/xGAgainst derived from fixture results.
 */
export function buildFixtureDifficulty(
  tier: OpponentTier,
  opponent = "TBD",
  fixtureId?: string,
  overrides?: Partial<Pick<FixtureDifficulty, "xGFor" | "xGAgainst" | "probCleanSheet">>
): FixtureDifficulty {
  const probDraw = 0.24;
  const probWin = P_WIN[tier];
  return {
    fixtureId,
    opponent,
    tier,
    probWin,
    probDraw,
    probLoss: +(1 - probWin - probDraw).toFixed(3),
    xGFor: overrides?.xGFor ?? XG_FOR[tier],
    xGAgainst: overrides?.xGAgainst ?? XG_AGAINST[tier],
    probCleanSheet: overrides?.probCleanSheet ?? P_CLEAN_SHEET[tier],
  };
}

// ─── EV computation ───────────────────────────────────────────────────────────

/**
 * Compute the expected Fantasy points for a player in one fixture.
 *
 * Positive and negative contributions are itemised so the skill can explain
 * exactly why a player is rated highly or penalised.
 */
export function computePlayerFixtureEV(
  position: number,
  fixture: FixtureDifficulty,
  formMultiplier = 1.0,
  playerRates?: PlayerRateOverrides
): PlayerFixtureEV {
  const pos = position as 1 | 2 | 3 | 4;
  const pPlays = (playerRates?.pPlays ?? P_PLAYS) * formMultiplier;
  const pPlays60 = pPlays * (playerRates?.pPlays60 ?? P_PLAYS_60);
  const pPlaysSub = pPlays - pPlays60; // plays but <60 min

  // ── Minutes ──────────────────────────────────────────────────────────────
  const minuteEV =
    pPlays60 * SCORING.minutes.atLeast60 + pPlaysSub * SCORING.minutes.under60;

  // ── Goals ─────────────────────────────────────────────────────────────────
  const posGoalPts =
    pos === 1
      ? SCORING.goalByPosition.GK
      : pos === 2
      ? SCORING.goalByPosition.DEF
      : pos === 3
      ? SCORING.goalByPosition.MID
      : SCORING.goalByPosition.FWD;

  const eGoals = fixture.xGFor * (playerRates?.goalShare ?? GOAL_SHARE[pos]) * pPlays;
  const goalEV = eGoals * posGoalPts;

  // Multi-goal bonus: E[bonus] ≈ Σ_{k=2}^∞ (k-1)·P(Poisson(λ)=k)
  // = λ·(1 - e^{-λ}) - λ·e^{-λ}·λ … simplified to λ²/2 for small λ
  const goalBonusEV = eGoals > 0 ? Math.max(0, (eGoals * eGoals) / 2) : 0;

  // ── Assists ───────────────────────────────────────────────────────────────
  const eAssists = fixture.xGFor * (playerRates?.assistShare ?? ASSIST_SHARE[pos]) * pPlays;
  const assistEV = eAssists * SCORING.assist;

  // ── Clean sheet (GK / DEF only) ───────────────────────────────────────────
  const cleanSheetEV =
    pos === 1 || pos === 2
      ? fixture.probCleanSheet * pPlays60 * SCORING.cleanSheet.GK
      : 0;

  // ── Goals conceded penalty (GK / DEF) ────────────────────────────────────
  // Rule: 1st goal conceded removes CS bonus (already captured above as 0 CS EV).
  // 2nd goal onward: −1 per goal.
  // E[goals conceded beyond 1] using Poisson(xGA):
  //   E[max(0, X − 1)] = xGA − 1 + e^{−xGA}   (for xGA > 0)
  let concededEV = 0;
  if (pos === 1 || pos === 2) {
    const xGA = fixture.xGAgainst;
    const eExtraGoals = Math.max(0, xGA - 1 + Math.exp(-xGA));
    concededEV = -eExtraGoals * pPlays60; // −1 pt per extra goal; only if 60+ min
  }

  // ── Cards ─────────────────────────────────────────────────────────────────
  const pRed = P_RED[pos];
  const pTwoYellow = pRed * FRAC_TWO_YELLOW;
  const pStraightRed = pRed * (1 - FRAC_TWO_YELLOW);
  // Yellow + direct red: treat as "straight red that also carried a yellow earlier"
  // Approximation: rare; fold into straight red bucket for simplicity.
  const yellowEV = P_YELLOW[pos] * pPlays * SCORING.yellowCard;
  const redEV =
    pTwoYellow * pPlays * SCORING.twoYellowsToRed +
    pStraightRed * pPlays * SCORING.redCard;
  const cardEV = yellowEV + redEV;

  // ── Penalties ─────────────────────────────────────────────────────────────
  const causedPenEV = P_CAUSE_PENALTY[pos] * pPlays * SCORING.causedPenalty;
  const wonPenEV = P_WIN_PENALTY[pos] * pPlays * SCORING.wonPenalty;
  const gkSavePenEV =
    pos === 1
      ? P_PEN_IN_MATCH * P_GK_SAVES_PEN * pPlays * SCORING.goalkeeperSavedPenalty
      : 0;
  const penaltyEV = causedPenEV + wonPenEV + gkSavePenEV;

  // ── Own goals ─────────────────────────────────────────────────────────────
  const ownGoalEV = P_OWN_GOAL[pos] * pPlays * SCORING.ownGoal;

  const subtotalEV =
    minuteEV + goalEV + goalBonusEV + assistEV +
    cleanSheetEV + concededEV + cardEV + penaltyEV + ownGoalEV;

  return {
    fixtureId: fixture.fixtureId ?? fixture.opponent,
    opponent: fixture.opponent,
    minuteEV: +minuteEV.toFixed(3),
    goalEV: +goalEV.toFixed(3),
    goalBonusEV: +goalBonusEV.toFixed(3),
    assistEV: +assistEV.toFixed(3),
    cleanSheetEV: +cleanSheetEV.toFixed(3),
    concededEV: +concededEV.toFixed(3),
    cardEV: +cardEV.toFixed(3),
    penaltyEV: +penaltyEV.toFixed(3),
    ownGoalEV: +ownGoalEV.toFixed(3),
    subtotalEV: +subtotalEV.toFixed(3),
  };
}

/**
 * Aggregate EV for a player across multiple upcoming fixtures.
 * formMultiplier > 1 for in-form players, < 1 for those out of form or doubtful.
 */
export function computePlayerEV(
  playerId: number,
  playerName: string,
  position: number,
  price: number,
  fixtures: FixtureDifficulty[],
  formMultiplier = 1.0,
  playerRates?: PlayerRateOverrides
): PlayerEV {
  const fixtureEVs = fixtures.map((f) =>
    computePlayerFixtureEV(position, f, formMultiplier, playerRates)
  );
  const totalEV = fixtureEVs.reduce((s, f) => s + f.subtotalEV, 0);
  const perFixture = fixtures.length > 0 ? totalEV / fixtures.length : 0;

  return {
    playerId,
    playerName,
    position,
    price,
    fixtureCount: fixtures.length,
    perFixtureEV: +perFixture.toFixed(3),
    totalEV: +totalEV.toFixed(3),
    captainEV: +(totalEV * 2).toFixed(3),
    tripleCaptainEV: +(totalEV * 3).toFixed(3),
    evPerMillion: price > 0 ? +(totalEV / price).toFixed(3) : 0,
    fixtures: fixtureEVs,
  };
}

// ─── Squad EV ─────────────────────────────────────────────────────────────────

/**
 * Summarise EV across the full 15-man squad.
 * starterIds: the 11 player IDs in the starting XI.
 */
export function computeSquadEV(
  players: PlayerEV[],
  starterIds: Set<number>
): SquadEV {
  const starters = players.filter((p) => starterIds.has(p.playerId));
  // Cap the bench to the 4 highest-EV non-starters. Callers may pass extra
  // transfer candidates alongside the 15-man squad; those must NOT inflate the
  // bench / All-Squad-chip EV (a real squad has exactly 4 bench players).
  const bench = players
    .filter((p) => !starterIds.has(p.playerId))
    .sort((a, b) => b.totalEV - a.totalEV)
    .slice(0, 4);

  const startingXIEV = starters.reduce((s, p) => s + p.totalEV, 0);
  const benchEV = bench.reduce((s, p) => s + p.totalEV, 0);

  // Best captain: player with highest individual EV (captain adds +1×EV on top)
  const sorted = [...starters].sort((a, b) => b.totalEV - a.totalEV);
  const best = sorted[0];
  const second = sorted[1];
  // Gain = extra EV compared to captaining the second-best
  const captainGain = best && second ? best.totalEV - second.totalEV : best?.totalEV ?? 0;

  // Best triple captain: player with highest EV (gain = +2× instead of +1×)
  const tcGain = best ? best.totalEV * 2 - best.totalEV : 0; // extra ×1 EV

  return {
    totalStartingXIEV: +startingXIEV.toFixed(3),
    totalBenchEV: +benchEV.toFixed(3),
    totalSquadEV: +(startingXIEV + benchEV).toFixed(3),
    allSquadChipExtraEV: +benchEV.toFixed(3),
    bestCaptainId: best?.playerId ?? 0,
    bestCaptainName: best?.playerName ?? "",
    bestCaptainEVGain: +captainGain.toFixed(3),
    bestTripleCaptainId: best?.playerId ?? 0,
    bestTripleCaptainName: best?.playerName ?? "",
    bestTripleCaptainEVGain: +tcGain.toFixed(3),
    players,
  };
}

// ─── Transfer evaluation ──────────────────────────────────────────────────────

/**
 * Score and describe a single transfer candidate.
 *
 * budget: remaining free budget after removing player_out's price (M).
 * nationTeamCounts: current count of players from each national team in the squad.
 * maxPerNationalTeam: stage cap.
 * playerOutNationId / playerInNationId: used to check the cap.
 */
export function evaluateTransfer(opts: {
  playerOut: PlayerEV;
  playerIn: PlayerEV;
  budgetM: number;
  nationTeamCounts: Record<number, number>;
  playerOutNationId: number;
  playerInNationId: number;
  maxPerNationalTeam: number;
}): TransferCandidate {
  const {
    playerOut,
    playerIn,
    budgetM,
    nationTeamCounts,
    playerOutNationId,
    playerInNationId,
    maxPerNationalTeam,
  } = opts;

  const budgetDelta = playerIn.price - playerOut.price;
  const freeBudgetAfter = budgetM - budgetDelta;

  let isFeasible = true;
  let infeasibilityReason: string | undefined;

  // Position must match (1-for-1 swap)
  if (playerIn.position !== playerOut.position) {
    isFeasible = false;
    infeasibilityReason = "Position mismatch";
  }

  // Budget check
  if (freeBudgetAfter < 0) {
    isFeasible = false;
    infeasibilityReason = `Over budget by ${(-freeBudgetAfter).toFixed(1)}M`;
  }

  // National team cap check
  if (isFeasible) {
    const currentCount = nationTeamCounts[playerInNationId] ?? 0;
    const sameNation = playerInNationId === playerOutNationId;
    const countAfter = sameNation ? currentCount : currentCount + 1;
    if (countAfter > maxPerNationalTeam) {
      isFeasible = false;
      infeasibilityReason = `Would exceed ${maxPerNationalTeam}-player cap for this national team`;
    }
  }

  const evGain = playerIn.totalEV - playerOut.totalEV;

  const rationale = isFeasible
    ? `${playerIn.playerName} brings ${playerIn.totalEV.toFixed(1)} EV vs ${playerOut.playerName}'s ${playerOut.totalEV.toFixed(1)} → gain +${evGain.toFixed(1)} pts.` +
      (budgetDelta > 0 ? ` Costs ${budgetDelta.toFixed(1)}M extra.` : budgetDelta < 0 ? ` Frees up ${(-budgetDelta).toFixed(1)}M.` : "")
    : `Cannot transfer: ${infeasibilityReason}`;

  return {
    playerOutId: playerOut.playerId,
    playerOutName: playerOut.playerName,
    playerOutPosition: playerOut.position,
    playerOutPrice: playerOut.price,
    playerOutEV: +playerOut.totalEV.toFixed(3),
    playerInId: playerIn.playerId,
    playerInName: playerIn.playerName,
    playerInPosition: playerIn.position,
    playerInPrice: playerIn.price,
    playerInEV: +playerIn.totalEV.toFixed(3),
    evGain: +evGain.toFixed(3),
    budgetDelta: +budgetDelta.toFixed(1),
    isFeasible,
    infeasibilityReason,
    rationale,
  };
}

// ─── Chip timing ──────────────────────────────────────────────────────────────

/**
 * Heuristic recommendations for when to use each bonus chip.
 *
 * squadEV:           current round EV for the full squad.
 * captainEV:         current captain's EV.
 * bestAvailableEV:   highest EV player currently available in the market (for context).
 * roundsRemaining:   how many rounds are left in the tournament.
 * chipsUsed:         array of chip keys already spent.
 * stage:             current tournament stage.
 */
export function evaluateChips(opts: {
  squadEV: SquadEV;
  roundsRemaining: number;
  chipsUsed: string[];
  stage: string;
}): ChipRecommendation[] {
  const { squadEV, roundsRemaining, chipsUsed, stage } = opts;

  const captainEV = (squadEV.players.find((p) => p.playerId === squadEV.bestCaptainId)?.totalEV ?? 0);
  // Average captain EV across remaining rounds (approximation)
  const avgCaptainEV = captainEV; // current round proxy

  const results: ChipRecommendation[] = [];

  // ── Triple Captain ─────────────────────────────────────────────────────────
  const tcUsed = chipsUsed.includes("triple_captain");
  const tcEVGain = captainEV; // extra +1× on top of regular ×2 captain
  const isGoodCaptainRound = captainEV > avgCaptainEV * 1.2;
  results.push({
    chipKey: "triple_captain",
    chipLabel: "Triple Captain",
    alreadyUsed: tcUsed,
    recommendNow: !tcUsed && isGoodCaptainRound && roundsRemaining <= 3,
    evGainIfUsedNow: +tcEVGain.toFixed(2),
    rationale: tcUsed
      ? "Already used."
      : isGoodCaptainRound
      ? `Captain ${squadEV.bestCaptainName} has above-average EV (${captainEV.toFixed(1)} pts). Good round to use.`
      : `Save for a round where your captain has a great fixture vs. a weak opponent.`,
  });

  // ── Five Substitutions ─────────────────────────────────────────────────────
  // This chip raises a round's transfers to 5. It only BEATS the native
  // allowance in a group-stage round (3/round). After the group stage every
  // phase gives ≥5 or unlimited transfers (r32/r16 unlimited pre-stage windows;
  // qf 5, sf 6, final 7), so the chip is redundant or worse there — and expires
  // worthless if not used during the group stage.
  const subUsed = chipsUsed.includes("five_subs");
  const isGroupStage = stage === "group";
  results.push({
    chipKey: "five_subs",
    chipLabel: "5 Substitutions",
    alreadyUsed: subUsed,
    recommendNow: !subUsed && isGroupStage,
    evGainIfUsedNow: 0, // = EV of the 4th/5th best transfer this round (caller-dependent)
    rationale: subUsed
      ? "Already used."
      : isGroupStage
      ? `Group stage grants only 3 transfers/round — this chip raises it to 5. Use it on the round (ideally the LAST group round) where you have 4+ worthwhile moves; it expires worthless once the knockouts begin (r32/r16 are unlimited, qf+ already grant 5–7).`
      : `No value at this stage — it already grants ≥5 (or unlimited) transfers, so the chip cannot beat the native allowance. It is only useful during the group stage.`,
  });

  // ── Double Captains ────────────────────────────────────────────────────────
  const dcUsed = chipsUsed.includes("double_captains");
  const vcEV = squadEV.players.find((p) => p.playerId !== squadEV.bestCaptainId)?.totalEV ?? 0;
  const dcEVGain = vcEV; // extra EV from vice-captain going ×2
  results.push({
    chipKey: "double_captains",
    chipLabel: "Double Captains",
    alreadyUsed: dcUsed,
    recommendNow: !dcUsed && !tcUsed && captainEV > 6 && vcEV > 5,
    evGainIfUsedNow: +dcEVGain.toFixed(2),
    rationale: dcUsed
      ? "Already used."
      : `Best when both captain and vice-captain have great fixtures. ` +
        `Can stack with Triple Captain (C gets ×3, VC gets ×2).`,
  });

  // ── All-Squad Points ───────────────────────────────────────────────────────
  const aspUsed = chipsUsed.includes("all_squad_points");
  const aspEVGain = squadEV.allSquadChipExtraEV;
  const goodAspRound = aspEVGain > 10; // bench expected to contribute meaningfully
  results.push({
    chipKey: "all_squad_points",
    chipLabel: "All-Squad Points",
    alreadyUsed: aspUsed,
    recommendNow: !aspUsed && goodAspRound && roundsRemaining <= 2,
    evGainIfUsedNow: +aspEVGain.toFixed(2),
    rationale: aspUsed
      ? "Already used."
      : goodAspRound
      ? `Your bench has combined EV of ${aspEVGain.toFixed(1)} pts this round — worthwhile to activate.`
      : `Bench EV is modest (${aspEVGain.toFixed(1)} pts). Save for a round when bench players face great opponents.`,
  });

  return results;
}

// ─── Deterministic scoring (for verifying completed rounds) ───────────────────

/**
 * Exact point calculation for a single player's match performance.
 * Use this to verify or audit Sport5's scoring after a match.
 */
export interface MatchEvents {
  minutesPlayed: number;
  goals: number;
  assists: number;
  cleanSheet: boolean;  // true only if team kept 0 goals AND player played 60+
  goalsConcededWhileOn: number;
  yellowCards: number;
  redCard: boolean;
  twoYellowsToRed: boolean;
  penaltyWon: number;
  penaltyCaused: number;
  penaltySaved: number; // GK only
  penaltyMissed: number;
  ownGoals: number;
  isCaptain: boolean;
  isTripleCaptain: boolean;
}

export function computeExactScore(events: MatchEvents, position: number): number {
  let pts = 0;

  // Minutes
  if (events.minutesPlayed > 0 && events.minutesPlayed < 60) pts += SCORING.minutes.under60;
  else if (events.minutesPlayed >= 60) pts += SCORING.minutes.atLeast60;

  // Goals
  const goalPts =
    position === 1
      ? SCORING.goalByPosition.GK
      : position === 2
      ? SCORING.goalByPosition.DEF
      : position === 3
      ? SCORING.goalByPosition.MID
      : SCORING.goalByPosition.FWD;
  pts += events.goals * goalPts;

  // Multi-goal bonus: n goals → n-1 bonus points
  if (events.goals >= 2) pts += events.goals - 1;

  // Assists
  pts += events.assists * SCORING.assist;

  // Clean sheet (GK/DEF only)
  if ((position === 1 || position === 2) && events.cleanSheet) {
    pts += SCORING.cleanSheet.GK;
  }

  // Goals conceded penalty (GK/DEF only): from 2nd goal onward
  if ((position === 1 || position === 2) && events.goalsConcededWhileOn >= 2) {
    pts += -(events.goalsConcededWhileOn - 1);
  }

  // Penalty events
  pts += events.penaltyWon * SCORING.wonPenalty;
  pts += events.penaltyCaused * SCORING.causedPenalty;
  pts += events.penaltySaved * SCORING.goalkeeperSavedPenalty;
  pts += events.penaltyMissed * SCORING.missedPenalty;

  // Own goals
  pts += events.ownGoals * SCORING.ownGoal;

  // Cards
  if (events.twoYellowsToRed) {
    pts += SCORING.twoYellowsToRed; // -3
  } else if (events.redCard) {
    pts += SCORING.redCard; // -3
  }
  // Yellow card separate (note: if 2Y→R, the first yellow is implicit — game deducts separately)
  pts += events.yellowCards * SCORING.yellowCard;

  // Captain multiplier
  if (events.isCaptain) {
    if (events.isTripleCaptain) {
      pts = pts * 3;
    } else {
      pts = pts * 2;
    }
  }

  return pts;
}
