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
