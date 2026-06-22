/**
 * Chip optimizer: finite-horizon backward induction.
 *
 * For each one-shot chip we solve:
 *   V[T] = 0
 *   V[t] = max(stopReward[t], E[V[t+1]])
 *   useNow iff stopReward[t] >= E[V[t+1]]
 *
 * E[V[t+1]] is estimated by sampling future round EV from a quasi-random grid
 * around the current squad's EV distribution.
 *
 * Replaces the heuristic evaluateChips() in scoring.ts and fixes the Triple
 * Captain gain formula (was returning captainEV instead of the extra +1× gain).
 */

import type { SquadEV, ChipRecommendation } from "./scoring.js";

const MC_SAMPLES = 200;

/** Quasi-random normal variate (quasi-Monte Carlo grid, reproducible). */
function qmcNormal(i: number, total: number): number {
  const u1 = Math.max(1e-10, (i + 0.5) / total);
  const u2 = (((i * 7 + 13) % total) + 0.5) / total;
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Estimate E[best chip reward across remaining rounds] via Monte Carlo.
 * Models future round reward as normally distributed around currentScale.
 */
function estimateContinuation(currentScale: number, roundsRemaining: number): number {
  if (roundsRemaining <= 1) return 0;
  const sigma = currentScale * 0.25;
  let best = 0;
  // For each of the remaining rounds, sample a reward distribution and take max
  for (let r = 1; r < roundsRemaining; r++) {
    let roundExpected = 0;
    for (let s = 0; s < MC_SAMPLES; s++) {
      const z = qmcNormal(s, MC_SAMPLES);
      roundExpected += Math.max(0, currentScale + sigma * z * Math.sqrt(r));
    }
    best = Math.max(best, roundExpected / MC_SAMPLES);
  }
  return best;
}

interface ChipSpec {
  key: string;
  label: string;
  /** Points gained by using this chip now (the extra points beyond not using it). */
  stopReward(sq: SquadEV): number;
  /** EV scale used to model future-round opportunities. */
  continuationScale(sq: SquadEV): number;
}

const CHIP_SPECS: ChipSpec[] = [
  {
    key: "triple_captain",
    label: "Triple Captain",
    // Extra gain: captain gets ×3 instead of ×2 → extra +1× captain's EV
    stopReward: (sq) => sq.players.find(p => p.playerId === sq.bestCaptainId)?.totalEV ?? 0,
    continuationScale: (sq) => sq.players.find(p => p.playerId === sq.bestCaptainId)?.totalEV ?? sq.totalStartingXIEV / 11,
  },
  {
    key: "double_captains",
    label: "Double Captains",
    // VC gets ×2 instead of ×1 → extra +1× VC's EV
    stopReward: (sq) => {
      const starters = sq.players.filter(
        p => p.playerId !== sq.bestCaptainId && p.totalEV > 0
      );
      if (!starters.length) return 0;
      return starters.reduce((best, p) => p.totalEV > best ? p.totalEV : best, 0);
    },
    continuationScale: (sq) => sq.totalStartingXIEV / 11,
  },
  {
    key: "all_squad_points",
    label: "All-Squad Points",
    // Bench players score: extra points = bench total EV
    stopReward: (sq) => sq.totalBenchEV,
    continuationScale: (sq) => sq.totalBenchEV,
  },
  {
    key: "five_subs",
    label: "5 Substitutions",
    // 2 extra transfer slots ≈ 1.5 pts/transfer (conservative)
    stopReward: (_sq) => 3.0,
    continuationScale: (_sq) => 2.5,
  },
];

/**
 * Recommend chips via backward induction.
 * Returns an extended ChipRecommendation with useNow, threshold, continuationValue.
 */
export function recommendChips(opts: {
  squadEV: SquadEV;
  roundsRemaining: number;
  chipsUsed: string[];
  stage: string;
}): Array<ChipRecommendation & { useNow: boolean; threshold: number; continuationValue: number }> {
  const { squadEV, roundsRemaining, chipsUsed, stage } = opts;

  return CHIP_SPECS.map(spec => {
    const alreadyUsed = chipsUsed.includes(spec.key);
    const stopReward = alreadyUsed ? 0 : spec.stopReward(squadEV);
    const scale = spec.continuationScale(squadEV);

    const continuationValue =
      alreadyUsed || roundsRemaining <= 1
        ? 0
        : estimateContinuation(scale, roundsRemaining);

    const useNow = !alreadyUsed && roundsRemaining >= 1 && stopReward >= continuationValue;

    let rationale: string;
    if (alreadyUsed) {
      rationale = "Already used.";
    } else if (roundsRemaining <= 0) {
      rationale = "No rounds remaining.";
    } else if (useNow) {
      rationale =
        `Optimal now: reward ${stopReward.toFixed(1)} pts ≥ best future opportunity ` +
        `${continuationValue.toFixed(1)} pts (${roundsRemaining - 1} rounds left).`;
    } else {
      rationale =
        `Hold: expected best future opportunity ${continuationValue.toFixed(1)} pts ` +
        `> current reward ${stopReward.toFixed(1)} pts. Reassess next round.`;
    }

    if (spec.key === "five_subs" && !alreadyUsed) {
      const isTransition = ["r32", "r16", "qf"].includes(stage);
      if (isTransition) {
        rationale += ` Stage transition (${stage}) — good window for extra transfers.`;
      }
    }

    return {
      chipKey: spec.key,
      chipLabel: spec.label,
      alreadyUsed,
      recommendNow: useNow,
      evGainIfUsedNow: +stopReward.toFixed(2),
      rationale,
      useNow,
      threshold: +continuationValue.toFixed(2),
      continuationValue: +continuationValue.toFixed(2),
    };
  });
}
