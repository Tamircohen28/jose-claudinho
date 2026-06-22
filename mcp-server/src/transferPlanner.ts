/**
 * Rolling-horizon transfer planner for Fantasy World Cup 2026.
 *
 * For each remaining stage, solves the MILP squad optimizer with:
 *   1. Player EV weighted by P(team plays that stage) from bracket predictions
 *   2. Transfer-count constraint limiting changes from current squad
 *
 * This replaces the myopic greedy single-round ΔEV approach with a proper
 * look-ahead across the entire remaining tournament horizon.
 */

import { STAGES, type StageKey, type StageRule } from "./rules.js";
import { optimizeSquad, type PlayerInput, type OptimizedSquad } from "./squadOptimizer.js";

export interface BracketSurvivalProbs {
  /** Keyed by stage key, then team identifier → P(team plays this stage). */
  [stageKey: string]: Record<string, number>;
}

export interface TransferPlan {
  stage: StageKey;
  stageLabel: string;
  transfersAllowed: number;
  recommendedTransfers: Array<{
    playerOutId: number;
    playerOutName: string;
    playerInId: number;
    playerInName: string;
    evGain: number;
  }>;
  projectedSquad: OptimizedSquad;
  projectedEV: number;
  evGainVsStayingPat: number;
}

export interface TransferPlanResult {
  currentStage: StageKey;
  totalProjectedEV: number;
  evGainVsNoChanges: number;
  stageByStage: TransferPlan[];
}

const STAGE_ORDER: StageKey[] = ["group", "r32", "r16", "qf", "sf", "final"];

/** Adjust player EV by team survival probability for a given stage. */
function weightByBracket(
  players: PlayerInput[],
  stageKey: StageKey,
  survivalProbs: BracketSurvivalProbs
): PlayerInput[] {
  const probs = survivalProbs[stageKey];
  if (!probs) return players;
  return players.map(p => {
    const survivalP = probs[String(p.nationKey)] ?? 0.5;
    return { ...p, ev: +(p.ev * survivalP).toFixed(3) };
  });
}

/** How many players in newIds are NOT in currentIds (= transfers required). */
function countTransfers(currentIds: Set<number>, newIds: number[]): number {
  return newIds.filter(id => !currentIds.has(id)).length;
}

/**
 * Plan transfers across all remaining stages using rolling-horizon MILP.
 *
 * @param currentSquadIds  Player IDs in the current squad
 * @param currentStage     The stage we are planning from
 * @param budgetM          Current total budget in millions
 * @param allPlayers       Full player market
 * @param chipsUsed        Already-used chip keys (informational, not enforced here)
 * @param survivalProbs    Per-stage team survival probabilities from bracketPredictor
 */
export async function planTransfers(
  currentSquadIds: number[],
  currentStage: StageKey,
  budgetM: number,
  allPlayers: PlayerInput[],
  _chipsUsed: string[],
  survivalProbs: BracketSurvivalProbs
): Promise<TransferPlanResult> {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  if (currentIdx === -1) {
    return { currentStage, totalProjectedEV: 0, evGainVsNoChanges: 0, stageByStage: [] };
  }

  const remainingStages = STAGE_ORDER.slice(currentIdx);
  const playerMap = new Map(allPlayers.map(p => [p.playerId, p]));

  // Baseline EV: keep current squad unchanged for all remaining stages
  const currentSquadPlayers = currentSquadIds
    .map(id => playerMap.get(id))
    .filter((p): p is PlayerInput => p !== undefined);
  const baselinePerStage = currentSquadPlayers.reduce((s, p) => s + p.ev, 0);
  const baselineTotal = baselinePerStage * remainingStages.length;

  let rollingSquadIds = [...currentSquadIds];
  let rollingBudget = budgetM;
  let totalProjectedEV = 0;
  const stageByStage: TransferPlan[] = [];

  for (const stageKey of remainingStages) {
    const stageRule: StageRule = STAGES[stageKey];
    const rollingSet = new Set(rollingSquadIds);
    const weightedPlayers = weightByBracket(allPlayers, stageKey, survivalProbs);

    // First pass: unconstrained optimal for this stage
    let optimal: OptimizedSquad;
    try {
      optimal = await optimizeSquad(weightedPlayers, rollingBudget, stageKey);
    } catch {
      optimal = { feasible: false } as OptimizedSquad;
    }

    if (!optimal.feasible) {
      const evNow = currentSquadPlayers.reduce((s, p) => s + p.ev, 0);
      stageByStage.push({
        stage: stageKey,
        stageLabel: stageRule.label,
        transfersAllowed: stageRule.transfersPerRound,
        recommendedTransfers: [],
        projectedSquad: optimal,
        projectedEV: evNow,
        evGainVsStayingPat: 0,
      });
      totalProjectedEV += evNow;
      continue;
    }

    const neededTransfers = countTransfers(rollingSet, optimal.squadPlayerIds);

    let finalOptimal = optimal;
    if (neededTransfers > stageRule.transfersPerRound) {
      // Constrained pass: lock in all but the N weakest current players
      const currentPool = rollingSquadIds
        .map(id => weightedPlayers.find(p => p.playerId === id))
        .filter((p): p is PlayerInput => p !== undefined)
        .sort((a, b) => a.ev - b.ev); // weakest first

      const nToRelease = stageRule.transfersPerRound;
      const toRelease = new Set(currentPool.slice(0, nToRelease).map(p => p.playerId));
      const lockedIds = new Set(rollingSquadIds.filter(id => !toRelease.has(id)));

      const constrainedPool = weightedPlayers.map(p => ({
        ...p,
        locked: lockedIds.has(p.playerId),
        excluded: false,
      }));

      try {
        finalOptimal = await optimizeSquad(constrainedPool, rollingBudget, stageKey);
      } catch {
        finalOptimal = optimal; // fall back to unconstrained if constrained fails
      }
    }

    // Compute the transfer diff
    const newSet = new Set(finalOptimal.squadPlayerIds);
    const playersOut = rollingSquadIds.filter(id => !newSet.has(id));
    const playersIn = finalOptimal.squadPlayerIds.filter(id => !rollingSet.has(id));
    const nMoves = Math.min(playersIn.length, playersOut.length, stageRule.transfersPerRound);

    const recommendedTransfers = Array.from({ length: nMoves }, (_, i) => {
      const inId = playersIn[i] ?? 0;
      const outId = playersOut[i] ?? 0;
      const pIn = allPlayers.find(p => p.playerId === inId);
      const pOut = allPlayers.find(p => p.playerId === outId);
      return {
        playerOutId: outId,
        playerOutName: pOut?.playerName ?? "?",
        playerInId: inId,
        playerInName: pIn?.playerName ?? "?",
        evGain: +((pIn?.ev ?? 0) - (pOut?.ev ?? 0)).toFixed(2),
      };
    });

    const evNow = currentSquadPlayers.reduce((s, p) => s + p.ev, 0);

    stageByStage.push({
      stage: stageKey,
      stageLabel: stageRule.label,
      transfersAllowed: stageRule.transfersPerRound,
      recommendedTransfers,
      projectedSquad: finalOptimal,
      projectedEV: finalOptimal.totalStarterEV,
      evGainVsStayingPat: +(finalOptimal.totalStarterEV - evNow).toFixed(2),
    });

    totalProjectedEV += finalOptimal.totalStarterEV;
    rollingSquadIds = finalOptimal.squadPlayerIds;
    rollingBudget = finalOptimal.budgetRemainingM;
  }

  return {
    currentStage,
    totalProjectedEV: +totalProjectedEV.toFixed(2),
    evGainVsNoChanges: +(totalProjectedEV - baselineTotal).toFixed(2),
    stageByStage,
  };
}
