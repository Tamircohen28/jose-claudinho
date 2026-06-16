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
  group?: string;      // e.g. "A", "B", …, "L"
  round?: number;      // 1, 2, or 3 for group stage
  stage?: string;      // "group", "r32", etc.
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
  groupRank?: number;       // 1st, 2nd, 3rd, 4th in group
  /** Estimated probability of advancing from the group stage */
  probAdvanceFromGroup: number;
  /** Expected additional rounds (beyond current stage) */
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
  /** Probability this specific pairing actually occurs */
  matchupProbability: number;
  note?: string;
}

export interface BracketPrediction {
  groups: GroupStandings[];
  probableMatchups: ProbableMatchup[];
  /** Per-team expected additional rounds remaining */
  teamExpectedRounds: Record<string, number>;
  /** For each team: estimated P(reaches each stage) */
  teamStageProbabilities: Record<string, Record<string, number>>;
}

// ─── Group standings computation ──────────────────────────────────────────────

/**
 * Build group standings from a list of played fixture results.
 * Only processes group-stage fixtures (stage === "group" or round in 1-3).
 */
export function buildGroupStandings(results: FixtureResult[]): GroupStandings[] {
  const groupResults = results.filter(
    (r) => r.stage === "group" || (r.round != null && r.round <= 3 && r.stage == null)
  );

  // Collect all teams and groups
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

  // Convert to sorted standings
  const standings: GroupStandings[] = [];
  for (const [group, teamsMap] of Array.from(groupMap.entries()).sort()) {
    const teams = Array.from(teamsMap.values()).sort(standingComparator);
    teams.forEach((t, i) => { t.groupRank = i + 1; });

    // Max games in a group of 4: each team plays 3
    const isComplete = teams.every((t) => t.played === 3);

    // Estimate advancement probabilities
    estimateAdvancementProbs(teams, isComplete);

    standings.push({ group, teams, isComplete });
  }

  return standings;
}

/** FIFA tiebreaker: points → GD → GF → (simplification: alphabetical) */
function standingComparator(a: TeamStanding, b: TeamStanding): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  return a.teamName.localeCompare(b.teamName);
}

/**
 * Estimate P(advance from group) per team.
 * After all 3 group games: rank 1/2 → certain; rank 3 → maybe (best 3rd); rank 4 → out.
 * Before completion: probabilistic based on current form.
 */
function estimateAdvancementProbs(teams: TeamStanding[], isComplete: boolean): void {
  if (isComplete) {
    // Ranks 1-2 advance for certain (top 2 guaranteed)
    // Rank 3: best 8 3rd-place teams advance — P ≈ 60% on average (depends on group)
    // Rank 4: eliminated
    const probs = [1.0, 1.0, 0.60, 0.0];
    teams.forEach((t, i) => { t.probAdvanceFromGroup = probs[i] ?? 0; });
  } else {
    // Heuristic based on points and games played
    teams.forEach((t) => {
      const ptsPerGame = t.played > 0 ? t.points / t.played : 1;
      // Rough sigmoid: 3 pts/g → very likely, 1 pt/g → unlikely
      t.probAdvanceFromGroup = Math.min(0.95, Math.max(0.05, (ptsPerGame - 0.3) / 2.7));
    });
  }

  // Expected additional rounds = P(advance from group) × E[rounds in knockouts]
  // R32 win (P≈0.5) → R16 win (P≈0.45) → QF win (P≈0.40) → SF win (P≈0.35) → Final
  // E[knockout rounds] ≈ 0.5+0.5*0.45+… ≈ 1.6 for equal teams; adjust by seed
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

// ─── Bracket matchup prediction ────────────────────────────────────────────────

/**
 * WC 2026 R32 bracket: the 32 advancing teams are seeded into 16 matches.
 * The draw pairs specific group slots. This is an approximation of the
 * actual FIFA bracket seeding announced before the tournament.
 *
 * Format: [groupWinner, groupRunnerUp] → who they face in R32.
 * The pairing below follows FIFA's announced bracket for WC 2026 groups A-L.
 */
const R32_BRACKET: Array<[string, string]> = [
  ["1A", "2B"], ["1C", "2D"], ["1E", "2F"], ["1G", "2H"],
  ["1B", "2A"], ["1D", "2C"], ["1F", "2E"], ["1H", "2G"],
  ["1I", "2J"], ["1K", "2L"], ["1J", "2I"], ["1L", "2K"],
  ["3A_D", "3E_H"],  // best 3rd-place bracket slots (approximation)
  ["3I_L", "3A_D"],
  ["3E_H", "3I_L"],
  ["3A_D", "3E_H"],  // repeated placeholder for 8 3rd-place slots
];

/**
 * Given group standings, generate probable R32 matchups.
 * Returns a list of matchups with team names and pairing probabilities.
 */
export function predictProbableMatchups(
  standings: GroupStandings[]
): BracketPrediction {
  // Build lookup: "1A" → probable team name for that bracket slot
  const slotTeam = new Map<string, { team: string; prob: number }>();

  for (const gs of standings) {
    const g = gs.group.toUpperCase();
    for (const t of gs.teams) {
      const rank = t.groupRank ?? 5;
      if (rank === 1) slotTeam.set(`1${g}`, { team: t.teamName, prob: t.probAdvanceFromGroup });
      if (rank === 2) slotTeam.set(`2${g}`, { team: t.teamName, prob: t.probAdvanceFromGroup });
      if (rank === 3) {
        // Simplified: label 3rd-placers by their group for the 3rd-place bracket slot
        slotTeam.set(`3${g}`, { team: t.teamName, prob: t.probAdvanceFromGroup });
      }
    }
  }

  const matchups: ProbableMatchup[] = [];

  // R32 matchups
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

  // Build per-team expected rounds
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
  // Handle multi-group 3rd-place slots (e.g. "3A_D" = best 3rd from groups A-D)
  if (slot.startsWith("3") && slot.includes("_")) {
    return { team: "Best 3rd (TBD)", prob: 0.60 };
  }
  return slotMap.get(slot) ?? null;
}

// ─── Fixture difficulty from form ─────────────────────────────────────────────

/**
 * Derive opponent tier from how many goals they scored/conceded in the group stage.
 * Used to calibrate EV when fixture result data is available.
 */
export function deriveOpponentTierFromForm(
  opponentGoalsFor: number,
  opponentGoalsConceded: number,
  gamesPlayed: number
): "elite" | "strong" | "medium" | "weak" {
  if (gamesPlayed === 0) return "medium";
  const xGPerGame = opponentGoalsFor / gamesPlayed;
  const xGAPerGame = opponentGoalsConceded / gamesPlayed;

  // Attacking + defensive composite score (lower GA is better defence)
  const score = xGPerGame - xGAPerGame;

  if (score >= 1.5) return "elite";
  if (score >= 0.5) return "strong";
  if (score >= -0.5) return "medium";
  return "weak";
}
