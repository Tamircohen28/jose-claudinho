/**
 * League-win probability overlay for Fantasy WC private leagues.
 *
 * Computes P(you outperform each rival) and P(you win the league) using a
 * normal approximation over projected EV distributions. Also recommends an
 * adaptive strategy mode (conservative / balanced / aggressive) based on
 * league position and rounds remaining.
 */

// ── Normal CDF approximation (Abramowitz & Stegun 26.2.17) ───────────────────

function normCdf(z: number): number {
  if (z > 6) return 1;
  if (z < -6) return 0;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    t * (0.319381530 +
    t * (-0.356563782 +
    t * (1.781477937 +
    t * (-1.821255978 +
    t * 1.330274429))));
  const approx = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly;
  return z >= 0 ? approx : 1 - approx;
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface RivalProjection {
  teamName: string;
  managerId?: number;
  projectedEV: number;
  currentScore?: number;
}

export interface LeagueWinReport {
  /** P(your score > each rival's score this round) */
  rivalWinProbabilities: Array<{
    teamName: string;
    pBeatRival: number;
    evDiff: number;
  }>;
  /** P(you beat ALL rivals — simplified league-win estimate) */
  pWinLeague: number;
  /** Recommended strategy mode */
  strategyMode: "conservative" | "balanced" | "aggressive";
  /** Human-readable reason for the strategy mode */
  strategyRationale: string;
  /** Estimated extra points needed to catch the leader (0 if you are leading) */
  pointsNeededToLead: number;
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Compute league-win probability and recommend a strategy mode.
 */
export function computeLeagueWinProbability(opts: {
  myProjectedEV: number;
  myEVVariance?: number;
  rivals: RivalProjection[];
  myRank: number;
  totalTeams: number;
  roundsRemaining: number;
  myCurrentScore?: number;
  leaderCurrentScore?: number;
}): LeagueWinReport {
  const {
    myProjectedEV,
    rivals,
    myRank,
    totalTeams,
    roundsRemaining,
    myCurrentScore,
    leaderCurrentScore,
  } = opts;

  const myVariance = opts.myEVVariance ?? myProjectedEV * 0.25;

  const rivalWinProbabilities = rivals.map((rival) => {
    const evDiff = myProjectedEV - rival.projectedEV;
    const rivalVariance = rival.projectedEV * 0.25;
    const diffStdDev = Math.sqrt(myVariance + rivalVariance) || 1;
    const z = evDiff / diffStdDev;
    const pBeatRival = normCdf(z);
    return {
      teamName: rival.teamName,
      pBeatRival: +pBeatRival.toFixed(3),
      evDiff: +evDiff.toFixed(1),
    };
  });

  const pWinLeague = rivalWinProbabilities.reduce(
    (acc, r) => acc * r.pBeatRival,
    1.0
  );

  const pointsNeededToLead =
    myCurrentScore != null && leaderCurrentScore != null
      ? Math.max(0, leaderCurrentScore - myCurrentScore)
      : 0;

  let strategyMode: LeagueWinReport["strategyMode"] = "balanced";
  let strategyRationale: string;

  const isLeading = myRank === 1;
  const isNearEnd = roundsRemaining <= 2;
  const isTrailing = myRank > Math.ceil(totalTeams * 0.4);
  const comfortableGap =
    pointsNeededToLead === 0 ||
    (myCurrentScore != null &&
      leaderCurrentScore != null &&
      leaderCurrentScore - myCurrentScore < 10);

  if (isLeading && isNearEnd && comfortableGap) {
    strategyMode = "conservative";
    strategyRationale =
      `You are leading with ${roundsRemaining} round(s) left. ` +
      `Copy template picks and consensus captain to protect your advantage — ` +
      `avoid differentials that create unnecessary variance.`;
  } else if (isTrailing || (!isLeading && pointsNeededToLead > 15)) {
    strategyMode = "aggressive";
    strategyRationale =
      `You are ${myRank === 1 ? "level" : `ranked #${myRank}`} with ` +
      `${pointsNeededToLead > 0 ? `${pointsNeededToLead} pts to make up` : "rivals close behind"}. ` +
      `Prioritise low-ownership differentials, concentrated captaincy in non-template players, ` +
      `and consider chips that maximise ceiling rather than floor.`;
  } else {
    strategyRationale =
      `Balanced position — blend template and differential picks. ` +
      `Follow consensus captain unless a low-owned player has a clearly superior fixture.`;
  }

  return {
    rivalWinProbabilities,
    pWinLeague: +pWinLeague.toFixed(4),
    strategyMode,
    strategyRationale,
    pointsNeededToLead,
  };
}
