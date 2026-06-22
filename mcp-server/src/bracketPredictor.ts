/**
 * World Cup 2026 bracket predictor.
 *
 * Computes group standings from fixture results, estimates each team's
 * probability of advancing through each knockout round, and returns
 * probable matchup pairings for the next 1-3 rounds.
 *
 * WC 2026 format (48 teams):
 *   - 12 groups of 4 → top 2 + 8 best 3rd-place teams advance (32 total)
 *   - R32 → R16 → QF → SF → Final
 *
 * Note: the actual FIFA R32 bracket seeding is pre-determined based on group
 * letters. We approximate probable matchups using that bracket layout.
 */

export interface FixtureResult {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  group?: string;
  round?: number;
  stage?: string;
  date?: string;
}

export interface TeamStanding {
  teamName: string;
  group: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  groupRank?: number;
  probAdvanceFromGroup: number;
  expectedRoundsRemaining: number;
}

export interface GroupStandings {
  group: string;
  teams: TeamStanding[];
  isComplete: boolean;
}

export interface ProbableMatchup {
  round: "r32" | "r16" | "qf" | "sf" | "final";
  roundLabel: string;
  team1: string;
  team1AdvanceProbability: number;
  team2: string;
  team2AdvanceProbability: number;
  matchupProbability: number;
  note?: string;
}

export interface BracketPrediction {
  groups: GroupStandings[];
  probableMatchups: ProbableMatchup[];
  teamExpectedRounds: Record<string, number>;
  teamStageProbabilities: Record<string, Record<string, number>>;
}

export interface TeamStrengthRating {
  teamName: string;
  strengthScore: number;
  gamesPlayed: number;
}

export interface TournamentPathBank {
  teamStageProbabilities: Record<string, {
    pGroup: number;
    pR32: number;
    pR16: number;
    pQF: number;
    pSF: number;
    pFinal: number;
  }>;
  expectedRoundsRemaining: Record<string, number>;
  simCount: number;
}

// --- Group standings computation ---

export function buildGroupStandings(results: FixtureResult[]): GroupStandings[] {
  const groupResults = results.filter(
    (r) => r.stage === "group" || (r.round != null && r.round <= 3 && r.stage == null)
  );

  const groupMap = new Map<string, Map<string, TeamStanding>>();

  function ensureTeam(group: string, teamName: string): TeamStanding {
    if (!groupMap.has(group)) groupMap.set(group, new Map());
    const g = groupMap.get(group)!;
    if (!g.has(teamName)) {
      g.set(teamName, {
        teamName,
        group,
        played: 0, won: 0, drawn: 0, lost: 0,
        gf: 0, ga: 0, gd: 0, points: 0,
        probAdvanceFromGroup: 0,
        expectedRoundsRemaining: 0,
      });
    }
    return g.get(teamName)!;
  }

  for (const r of groupResults) {
    const group = r.group ?? "?";
    const home = ensureTeam(group, r.homeTeam);
    const away = ensureTeam(group, r.awayTeam);

    home.played++;
    away.played++;
    home.gf += r.homeScore;
    home.ga += r.awayScore;
    away.gf += r.awayScore;
    away.ga += r.homeScore;
    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;

    if (r.homeScore > r.awayScore) {
      home.won++; home.points += 3;
      away.lost++;
    } else if (r.homeScore === r.awayScore) {
      home.drawn++; home.points++;
      away.drawn++; away.points++;
    } else {
      away.won++; away.points += 3;
      home.lost++;
    }
  }

  const standings: GroupStandings[] = [];
  for (const [group, teamsMap] of Array.from(groupMap.entries()).sort()) {
    const initialSorted = Array.from(teamsMap.values()).sort(standingComparator);
    const groupFixtures = groupResults.filter((r) => (r.group ?? "?").toUpperCase() === group);
    const teams = applyHeadToHeadTiebreaking(initialSorted, groupFixtures);
    teams.forEach((t, i) => { t.groupRank = i + 1; });

    const isComplete = teams.every((t) => t.played === 3);
    estimateAdvancementProbs(teams, isComplete);

    standings.push({ group, teams, isComplete });
  }

  return standings;
}

function standingComparator(a: TeamStanding, b: TeamStanding): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  return a.teamName.localeCompare(b.teamName);
}

function applyHeadToHeadTiebreaking(
  teams: TeamStanding[],
  groupResults: FixtureResult[]
): TeamStanding[] {
  const result = [...teams];
  let i = 0;
  while (i < result.length) {
    let j = i + 1;
    while (
      j < result.length &&
      result[j].points === result[i].points &&
      result[j].gd === result[i].gd &&
      result[j].gf === result[i].gf
    ) {
      j++;
    }
    if (j - i > 1) {
      const tied = result.slice(i, j);
      const tiedNames = new Set(tied.map((t) => t.teamName));
      const h2hResults = groupResults.filter(
        (r) => tiedNames.has(r.homeTeam) && tiedNames.has(r.awayTeam)
      );
      const h2h = new Map<string, { pts: number; gd: number; gf: number }>();
      tied.forEach((t) => h2h.set(t.teamName, { pts: 0, gd: 0, gf: 0 }));
      for (const r of h2hResults) {
        const home = h2h.get(r.homeTeam)!;
        const away = h2h.get(r.awayTeam)!;
        home.gf += r.homeScore;
        home.gd += r.homeScore - r.awayScore;
        away.gf += r.awayScore;
        away.gd += r.awayScore - r.homeScore;
        if (r.homeScore > r.awayScore) {
          home.pts += 3;
        } else if (r.homeScore === r.awayScore) {
          home.pts += 1;
          away.pts += 1;
        } else {
          away.pts += 3;
        }
      }
      tied.sort((a, b) => {
        const ha = h2h.get(a.teamName)!;
        const hb = h2h.get(b.teamName)!;
        if (hb.pts !== ha.pts) return hb.pts - ha.pts;
        if (hb.gd !== ha.gd) return hb.gd - ha.gd;
        if (hb.gf !== ha.gf) return hb.gf - ha.gf;
        return a.teamName.localeCompare(b.teamName);
      });
      for (let k = 0; k < tied.length; k++) result[i + k] = tied[k];
    }
    i = j;
  }
  return result;
}

/**
 * Estimate P(advance from group) per team.
 * For accurate KO-stage probabilities use simulateTournamentPaths() which runs
 * MC simulations with strength-adjusted win probabilities.
 */
function estimateAdvancementProbs(teams: TeamStanding[], isComplete: boolean): void {
  if (isComplete) {
    const probs = [1.0, 1.0, 0.60, 0.0];
    teams.forEach((t, i) => { t.probAdvanceFromGroup = probs[i] ?? 0; });
  } else {
    // Improved heuristic: points + GD as strength proxy
    teams.forEach((t) => {
      const ptsFraction = Math.min(1.0, t.points / 9);
      const gdBonus = Math.max(-0.1, Math.min(0.1, t.gd * 0.02));
      t.probAdvanceFromGroup = Math.min(0.92, Math.max(0.05, ptsFraction * 0.85 + gdBonus + 0.05));
    });
  }

  // Rough averages assuming equal teams; simulateTournamentPaths() gives strength-adjusted values.
  for (const t of teams) {
    const pAdv = t.probAdvanceFromGroup;
    const r32 = pAdv;
    const r16 = r32 * 0.50;
    const qf  = r16 * 0.50;
    const sf  = qf  * 0.50;
    const fin = sf  * 0.50;
    t.expectedRoundsRemaining =
      +(r32 * 1 + r16 * 1 + qf * 1 + sf * 1 + fin * 1).toFixed(2);
  }
}

// --- R32 bracket ---

const R32_BRACKET: Array<[string, string]> = [
  ["1A", "2B"], ["1C", "2D"], ["1E", "2F"], ["1G", "2H"],
  ["1B", "2A"], ["1D", "2C"], ["1F", "2E"], ["1H", "2G"],
  ["1I", "2J"], ["1K", "2L"], ["1J", "2I"], ["1L", "2K"],
  ["3A_D", "3E_H"],
  ["3I_L", "3A_L"],
  ["3E_L", "3A_E"],
  ["3best7", "3best8"],
];

export function predictProbableMatchups(
  standings: GroupStandings[]
): BracketPrediction {
  const slotTeam = new Map<string, { team: string; prob: number }>();

  for (const gs of standings) {
    const g = gs.group.toUpperCase();
    for (const t of gs.teams) {
      const rank = t.groupRank ?? 5;
      if (rank === 1) slotTeam.set(`1${g}`, { team: t.teamName, prob: t.probAdvanceFromGroup });
      if (rank === 2) slotTeam.set(`2${g}`, { team: t.teamName, prob: t.probAdvanceFromGroup });
      if (rank === 3) slotTeam.set(`3${g}`, { team: t.teamName, prob: t.probAdvanceFromGroup });
    }
  }

  const matchups: ProbableMatchup[] = [];

  for (const [slotA, slotB] of R32_BRACKET) {
    const a = resolveSlot(slotA, slotTeam);
    const b = resolveSlot(slotB, slotTeam);
    if (!a || !b) continue;
    matchups.push({
      round: "r32",
      roundLabel: "Round of 32",
      team1: a.team,
      team1AdvanceProbability: a.prob,
      team2: b.team,
      team2AdvanceProbability: b.prob,
      matchupProbability: +(a.prob * b.prob).toFixed(3),
      note: `${a.team} (${slotA}) vs ${b.team} (${slotB})`,
    });
  }

  const teamExpectedRounds: Record<string, number> = {};
  const teamStageProbabilities: Record<string, Record<string, number>> = {};

  for (const gs of standings) {
    for (const t of gs.teams) {
      teamExpectedRounds[t.teamName] = t.expectedRoundsRemaining;
      const pAdv = t.probAdvanceFromGroup;
      teamStageProbabilities[t.teamName] = {
        group: 1.0,
        r32: +pAdv.toFixed(3),
        r16: +(pAdv * 0.50).toFixed(3),
        qf: +(pAdv * 0.25).toFixed(3),
        sf: +(pAdv * 0.125).toFixed(3),
        final: +(pAdv * 0.063).toFixed(3),
      };
    }
  }

  return { groups: standings, probableMatchups: matchups, teamExpectedRounds, teamStageProbabilities };
}

function resolveSlot(
  slot: string,
  slotMap: Map<string, { team: string; prob: number }>
): { team: string; prob: number } | null {
  if (slot.startsWith("3") && (slot.includes("_") || slot.startsWith("3best"))) {
    return { team: "Best 3rd (TBD)", prob: 0.60 };
  }
  return slotMap.get(slot) ?? null;
}

// --- Strength-adjusted KO probability + MC simulator ---

function estimateKoWinProb(
  teamA: string,
  teamB: string,
  strengthMap: Map<string, number>
): number {
  const sA = strengthMap.get(teamA) ?? 0;
  const sB = strengthMap.get(teamB) ?? 0;
  if (sA === 0 && sB === 0) return 0.50;
  // Logistic; k=0.4 calibrated so 3-point gap ≈ 60% win probability
  const raw = 1 / (1 + Math.exp(-(sA - sB) * 0.4));
  return Math.max(0.20, Math.min(0.80, raw));
}

export function buildStrengthMap(standings: GroupStandings[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const gs of standings) {
    for (const t of gs.teams) {
      if (t.played === 0) continue;
      const score = (t.points * 2 + t.gd) / t.played;
      map.set(t.teamName, score);
    }
  }
  return map;
}

export function simulateTournamentPaths(
  standings: GroupStandings[],
  N = 500
): TournamentPathBank {
  const strengthMap = buildStrengthMap(standings);

  const counts: Record<string, { group: number; r32: number; r16: number; qf: number; sf: number; final: number }> = {};
  const allTeams: string[] = [];
  for (const gs of standings) {
    for (const t of gs.teams) {
      allTeams.push(t.teamName);
      counts[t.teamName] = { group: 0, r32: 0, r16: 0, qf: 0, sf: 0, final: 0 };
    }
  }

  for (let sim = 0; sim < N; sim++) {
    const advancedBySlot = new Map<string, string>();

    for (const gs of standings) {
      const g = gs.group.toUpperCase();
      const teams = gs.teams;

      if (gs.isComplete) {
        if (teams[0]) advancedBySlot.set(`1${g}`, teams[0].teamName);
        if (teams[1]) advancedBySlot.set(`2${g}`, teams[1].teamName);
        if (teams[2] && Math.random() < teams[2].probAdvanceFromGroup) {
          advancedBySlot.set(`3${g}`, teams[2].teamName);
        }
      } else {
        const sorted = [...teams].sort((a, b) => b.probAdvanceFromGroup - a.probAdvanceFromGroup);
        for (let rank = 0; rank < sorted.length; rank++) {
          const t = sorted[rank];
          if (Math.random() < t.probAdvanceFromGroup) {
            const slotKey = rank === 0 ? `1${g}` : rank === 1 ? `2${g}` : `3${g}`;
            advancedBySlot.set(slotKey, t.teamName);
          }
        }
      }
    }

    for (const name of advancedBySlot.values()) {
      if (counts[name]) counts[name].group++;
    }

    const r32Winners: string[] = [];
    for (const [slotA, slotB] of R32_BRACKET) {
      const teamA = advancedBySlot.get(slotA) ?? null;
      const teamB = advancedBySlot.get(slotB) ?? null;
      if (!teamA && !teamB) continue;
      if (!teamA) { if (teamB && counts[teamB]) { counts[teamB].r32++; r32Winners.push(teamB); } continue; }
      if (!teamB) { if (counts[teamA]) { counts[teamA].r32++; r32Winners.push(teamA); } continue; }
      const pA = estimateKoWinProb(teamA, teamB, strengthMap);
      const winner = Math.random() < pA ? teamA : teamB;
      if (counts[winner]) counts[winner].r32++;
      r32Winners.push(winner);
    }

    const r16Winners: string[] = [];
    for (let i = 0; i < r32Winners.length; i += 2) {
      const a = r32Winners[i];
      const b = r32Winners[i + 1];
      if (!a || !b) { if (a && counts[a]) { counts[a].r16++; r16Winners.push(a); } continue; }
      const pA = estimateKoWinProb(a, b, strengthMap);
      const winner = Math.random() < pA ? a : b;
      if (counts[winner]) counts[winner].r16++;
      r16Winners.push(winner);
    }

    const qfWinners: string[] = [];
    for (let i = 0; i < r16Winners.length; i += 2) {
      const a = r16Winners[i];
      const b = r16Winners[i + 1];
      if (!a || !b) { if (a && counts[a]) { counts[a].qf++; qfWinners.push(a); } continue; }
      const pA = estimateKoWinProb(a, b, strengthMap);
      const winner = Math.random() < pA ? a : b;
      if (counts[winner]) counts[winner].qf++;
      qfWinners.push(winner);
    }

    const sfWinners: string[] = [];
    for (let i = 0; i < qfWinners.length; i += 2) {
      const a = qfWinners[i];
      const b = qfWinners[i + 1];
      if (!a || !b) { if (a && counts[a]) { counts[a].sf++; sfWinners.push(a); } continue; }
      const pA = estimateKoWinProb(a, b, strengthMap);
      const winner = Math.random() < pA ? a : b;
      if (counts[winner]) counts[winner].sf++;
      sfWinners.push(winner);
    }

    for (let i = 0; i < sfWinners.length; i += 2) {
      const a = sfWinners[i];
      const b = sfWinners[i + 1];
      if (!a || !b) { if (a && counts[a]) counts[a].final++; continue; }
      const pA = estimateKoWinProb(a, b, strengthMap);
      const winner = Math.random() < pA ? a : b;
      if (counts[winner]) counts[winner].final++;
    }
  }

  const teamStageProbabilities: TournamentPathBank["teamStageProbabilities"] = {};
  const expectedRoundsRemaining: Record<string, number> = {};

  for (const teamName of allTeams) {
    const c = counts[teamName];
    if (!c) continue;
    const pGroup = c.group / N;
    const pR32 = c.r32 / N;
    const pR16 = c.r16 / N;
    const pQF = c.qf / N;
    const pSF = c.sf / N;
    const pFinal = c.final / N;
    teamStageProbabilities[teamName] = {
      pGroup: +pGroup.toFixed(3),
      pR32: +pR32.toFixed(3),
      pR16: +pR16.toFixed(3),
      pQF: +pQF.toFixed(3),
      pSF: +pSF.toFixed(3),
      pFinal: +pFinal.toFixed(3),
    };
    expectedRoundsRemaining[teamName] = +(pR32 + pR16 + pQF + pSF + pFinal).toFixed(2);
  }

  return { teamStageProbabilities, expectedRoundsRemaining, simCount: N };
}

// --- Fixture difficulty from form ---

export function deriveOpponentTierFromForm(
  opponentGoalsFor: number,
  opponentGoalsConceded: number,
  gamesPlayed: number
): "elite" | "strong" | "medium" | "weak" {
  if (gamesPlayed === 0) return "medium";
  const xGPerGame = opponentGoalsFor / gamesPlayed;
  const xGAPerGame = opponentGoalsConceded / gamesPlayed;
  const score = xGPerGame - xGAPerGame;

  if (score >= 1.5) return "elite";
  if (score >= 0.5) return "strong";
  if (score >= -0.5) return "medium";
  return "weak";
}
