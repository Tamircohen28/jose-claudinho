/**
 * Authoritative Fantasy World Cup 2026 (Sport5) rules.
 * Source of truth: the game's official terms & conditions
 * (jose-claudinho/fantasywc-sport5-terms-and-conditions.md).
 *
 * These constants drive every recommendation the advisor makes. If Sport5
 * changes the rules, update this file and rebuild — nothing else hard-codes them.
 */

export const POSITION_LABEL: Record<number, string> = {
  1: "GK",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

export type StageKey = "group" | "r32" | "r16" | "qf" | "sf" | "final";

export interface StageRule {
  key: StageKey;
  label: string;
  /** Total squad budget for this stage, in millions. */
  budgetM: number;
  /** Max players allowed from a single national team at this stage. */
  maxPerNationalTeam: number;
  /** Regular transfers allowed per round once the stage is underway. */
  transfersPerRound: number;
  /** Human note about the unlimited-transfer window before this stage. */
  transferWindowNote: string;
}

/**
 * Per-stage constraints. Budget, squad-per-team caps and transfer counts all
 * change as the tournament progresses.
 */
export const STAGES: Record<StageKey, StageRule> = {
  group: {
    key: "group",
    label: "Group stage",
    budgetM: 120,
    maxPerNationalTeam: 2,
    transfersPerRound: 3,
    transferWindowNote:
      "Unlimited transfers before round 1; 3 per round during the group stage.",
  },
  r32: {
    key: "r32",
    label: "Round of 32",
    budgetM: 120,
    maxPerNationalTeam: 2,
    transfersPerRound: 3,
    transferWindowNote:
      "Unlimited transfers in the window between the group stage and the Round of 32.",
  },
  r16: {
    key: "r16",
    label: "Round of 16",
    budgetM: 125,
    maxPerNationalTeam: 3,
    transfersPerRound: 3,
    transferWindowNote:
      "Unlimited transfers in the window before the Round of 16.",
  },
  qf: {
    key: "qf",
    label: "Quarter-final",
    budgetM: 125,
    maxPerNationalTeam: 4,
    transfersPerRound: 5,
    transferWindowNote: "5 transfers allowed before the quarter-finals.",
  },
  sf: {
    key: "sf",
    label: "Semi-final",
    budgetM: 130,
    maxPerNationalTeam: 7,
    transfersPerRound: 6,
    transferWindowNote: "6 transfers allowed before the semi-finals.",
  },
  final: {
    key: "final",
    label: "Final",
    budgetM: 135,
    maxPerNationalTeam: 9,
    transfersPerRound: 7,
    transferWindowNote: "7 transfers allowed for the final.",
  },
};

/** Squad shape every team must satisfy. */
export const SQUAD = {
  totalPlayers: 15,
  starters: 11,
  bench: 4,
  /** Starting XI position ranges (a valid formation must total 11). */
  startingXI: {
    GK: { min: 1, max: 1 },
    DEF: { min: 3, max: 5 },
    MID: { min: 3, max: 5 },
    FWD: { min: 1, max: 3 },
  },
  /** The 4 bench players must be exactly one of each position. */
  bench_composition: { GK: 1, DEF: 1, MID: 1, FWD: 1 },
};

/**
 * Scoring table. Points are awarded from the real player's match performance.
 * Goal value depends on the scorer's position.
 */
export const SCORING = {
  minutes: {
    under60: 1,
    atLeast60: 2,
    note: "Stoppage time does not count toward 60; extra time does.",
  },
  goalByPosition: { GK: 7, DEF: 6, MID: 5, FWD: 4 },
  goalMultiBonus:
    "Brace = +1 bonus, hat-trick = +2, four goals = +3, and so on (n goals → n-1 bonus).",
  assist: 3,
  cleanSheet: {
    GK: 4,
    DEF: 4,
    note: "Only if the player played at least 60 minutes (excluding stoppage time, including extra time).",
  },
  goalsConceded: {
    rule: "For GK/DEF: the first goal conceded cancels the clean-sheet bonus; from the second goal onward, -1 point per goal.",
  },
  wonPenalty: 2,
  causedPenalty: -4,
  goalkeeperSavedPenalty: 4,
  missedPenalty: -4,
  ownGoal: -5,
  yellowCard: -1,
  twoYellowsToRed: -3,
  redCard: -3,
  yellowPlusDirectRed: -4,
  note: "Penalty shootouts after extra time do NOT count toward scoring.",
};

/** Captain / vice-captain mechanics. */
export const CAPTAINCY = {
  captainMultiplier: 2,
  note: "Captain's points (including negatives) are doubled. If the captain does not play at all, the vice-captain is promoted automatically for that round and their points are doubled instead.",
};

/**
 * The four once-per-season bonus chips.
 *
 * The `bonusId` → chip mapping is VERIFIED against the game's own config
 * (Leagues/Get → sportTypeBasicConfig.bonusTypes). The API enum names are
 * given alongside the user-facing labels.
 */
export const BONUS_CHIPS = [
  {
    bonusId: 1,
    apiName: "TripleCaptain",
    key: "triple_captain",
    label: "Triple Captain",
    effect: "The captain scores x3 (instead of x2) for one round.",
  },
  {
    bonusId: 2,
    apiName: "ElevenSubs",
    key: "five_subs",
    label: "5 Substitutions",
    effect:
      "Make 5 transfers (instead of 3) in a single chosen round (season config allowedSubsInSubsBonus = 5).",
  },
  {
    bonusId: 3,
    apiName: "CaptainAndSubDouble",
    key: "double_captains",
    label: "Double Captains",
    effect:
      "Captain AND vice-captain both score double for one round. Stacks with Triple Captain (captain x3, vice x2).",
  },
  {
    bonusId: 4,
    apiName: "BenchScore",
    key: "all_squad_points",
    label: "All-Squad Points",
    effect: "All 15 players (starters + bench) score for one round.",
  },
];

/** Verified API bonusId → chip key map (sportTypeBasicConfig.bonusTypes). */
export const BONUS_ID_TO_KEY: Record<number, string> = {
  1: "triple_captain",
  2: "five_subs",
  3: "double_captains",
  4: "all_squad_points",
};

export function getStage(key: string | undefined): StageRule {
  const k = (key || "group").toLowerCase() as StageKey;
  return STAGES[k] || STAGES.group;
}

/**
 * Fantasy round → fixture mapping notes (see fixtures.ts fixturesForFantasyRound).
 * Sport5 roundId during group stage is typically 1, 2, 3 (one per matchday).
 * Tune intRound / date clustering in fixtures.ts if Sport5 numbering diverges.
 */
export const FANTASY_ROUND_FIXTURES = {
  groupStageMatchdays: 3,
  groupStageRoundIds: [1, 2, 3] as const,
  note:
    "Group stage Sport5 roundId 1/2/3 maps to WC matchdays via TheSportsDB intRound or date buckets.",
};

/** Max fantasy teams to analyze in league-wide round utilization (private leagues). */
export const LEAGUE_UTILIZATION_MAX_TEAMS = 50;

// ─── Mathematical scoring helpers ─────────────────────────────────────────────

/**
 * Points awarded for a multi-goal haul (brace, hat-trick, …).
 * Rule: n goals → (n − 1) bonus points on top of the base goal points.
 */
export function computeGoalMultiBonus(goalsScored: number): number {
  return Math.max(0, goalsScored - 1);
}

/**
 * Net goal-conceded penalty for a GK or DEF.
 *
 * Rule: the first goal conceded wipes the clean-sheet bonus (handled elsewhere);
 * every goal from the second onward costs −1 point.
 * Returns a negative number (or 0 if the player kept a clean sheet / conceded only 1).
 */
export function computeGoalsConcededPenalty(goalsConceded: number): number {
  return goalsConceded >= 2 ? -(goalsConceded - 1) : 0;
}

/**
 * Captain multiplier for a given chip state.
 * Returns the multiplier to apply to the captain's raw score.
 */
export function captainMultiplier(isTripleCaptain: boolean): number {
  return isTripleCaptain ? 3 : CAPTAINCY.captainMultiplier;
}

/**
 * Card penalty in points.
 *
 * twoYellowsToRed and redCard are mutually exclusive.
 * yellowCard can accompany a direct red (treated as −1 + −3 = −4 in the rules).
 */
export function computeCardPenalty(opts: {
  yellowCards: number;
  twoYellowsToRed: boolean;
  redCard: boolean;
}): number {
  let pts = 0;
  pts += opts.yellowCards * SCORING.yellowCard;
  if (opts.twoYellowsToRed) pts += SCORING.twoYellowsToRed;
  else if (opts.redCard) pts += SCORING.redCard;
  return pts;
}

/**
 * Points awarded for playing time (0 if the player did not feature at all).
 * stoppage-time minutes do NOT count toward the 60-minute threshold;
 * extra-time minutes DO count.
 */
export function computeMinutePoints(minutesPlayed: number): number {
  if (minutesPlayed <= 0) return 0;
  return minutesPlayed >= 60 ? SCORING.minutes.atLeast60 : SCORING.minutes.under60;
}

/**
 * Full deterministic score for one player in one match.
 * This mirrors what Sport5's scoring engine computes after a match completes.
 *
 * cleanSheet must already account for "played ≥ 60 min AND 0 goals conceded".
 * goalsConcededWhileOn must be the goals conceded while the player was on the pitch.
 */
export interface MatchEvents {
  minutesPlayed: number;
  goals: number;
  assists: number;
  /** True only if GK/DEF, played 60+ min, and team kept a clean sheet. */
  cleanSheet: boolean;
  /** Goals player's team conceded while they were on the pitch. */
  goalsConcededWhileOn: number;
  yellowCards: number;
  redCard: boolean;
  twoYellowsToRed: boolean;
  penaltyWon: number;
  penaltyCaused: number;
  /** GK only: number of penalties saved (deflected, not just blocked). */
  penaltySaved: number;
  penaltyMissed: number;
  ownGoals: number;
  isCaptain: boolean;
  isTripleCaptain: boolean;
}

export function computeExactScore(events: MatchEvents, position: number): number {
  const pos = position as 1 | 2 | 3 | 4;
  let pts = 0;

  pts += computeMinutePoints(events.minutesPlayed);

  const goalPts =
    pos === 1 ? SCORING.goalByPosition.GK
    : pos === 2 ? SCORING.goalByPosition.DEF
    : pos === 3 ? SCORING.goalByPosition.MID
    : SCORING.goalByPosition.FWD;

  pts += events.goals * goalPts;
  pts += computeGoalMultiBonus(events.goals);
  pts += events.assists * SCORING.assist;

  if ((pos === 1 || pos === 2) && events.cleanSheet) {
    pts += SCORING.cleanSheet.GK;
  }
  if (pos === 1 || pos === 2) {
    pts += computeGoalsConcededPenalty(events.goalsConcededWhileOn);
  }

  pts += events.penaltyWon * SCORING.wonPenalty;
  pts += events.penaltyCaused * SCORING.causedPenalty;
  pts += events.penaltySaved * SCORING.goalkeeperSavedPenalty;
  pts += events.penaltyMissed * SCORING.missedPenalty;
  pts += events.ownGoals * SCORING.ownGoal;

  pts += computeCardPenalty({
    yellowCards: events.yellowCards,
    twoYellowsToRed: events.twoYellowsToRed,
    redCard: events.redCard,
  });

  if (events.isCaptain) {
    pts *= captainMultiplier(events.isTripleCaptain);
  }

  return pts;
}

/** Full rules bundle for the get_game_rules tool, scoped to one stage. */
export function rulesForStage(stageKey: string | undefined) {
  const stage = getStage(stageKey);
  return {
    stage,
    squad: SQUAD,
    scoring: SCORING,
    captaincy: CAPTAINCY,
    bonusChips: BONUS_CHIPS,
    positions: POSITION_LABEL,
    transferDeadline:
      "Transfers and captain changes lock 30 minutes before the round opens. Anything after counts toward the next round.",
    benchAutoSub:
      "If a starter does not play, the system swaps in the bench player of the SAME position. With only one bench player per position, only the first non-playing starter in a position can be covered.",
  };
}
