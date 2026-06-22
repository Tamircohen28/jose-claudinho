/**
 * Team strength model for Fantasy World Cup 2026.
 *
 * Replaces the flat 4-tier xG lookup in scoring.ts with per-team
 * Poisson rates calibrated from Elo ratings + WC qualification data.
 *
 * Model: Dixon-Coles (1997) double-Poisson with low-score correction.
 *   mu_home = BASE_XG * attack[home] * defense[away]
 *   mu_away = BASE_XG * attack[away] * defense[home]
 *   tau correction applied at (0,0),(0,1),(1,0),(1,1) with rho = -0.13
 */

import type { FixtureDifficulty, OpponentTier } from "./scoring.js";

/** Average expected goals per team per WC match (calibrated to WC 2018+2022). */
const BASE_XG = 1.35;

/** Dixon-Coles rho (negative: corrects independence at low scores). */
const RHO = -0.13;

/** Max goals to sum over when computing win/draw/loss probabilities. */
const MAX_GOALS = 8;

/**
 * Per-team strength ratings (dimensionless, normalized so average ≈ 1.0).
 * attack: multiplier on goals scored vs average defence.
 * defense: goals-conceded multiplier vs average attack (lower = better defence).
 *
 * Calibrated from FIFA Elo + WC2026 qualification results (June 2026).
 * Keys are English TheSportsDB names from nations.ts sportsDbNames.
 */
export const TEAM_STRENGTH: Record<string, { attack: number; defense: number }> = {
  // Elite tier
  Argentina:              { attack: 1.55, defense: 0.58 },
  France:                 { attack: 1.48, defense: 0.62 },
  Brazil:                 { attack: 1.45, defense: 0.65 },
  England:                { attack: 1.38, defense: 0.68 },
  Spain:                  { attack: 1.42, defense: 0.63 },
  Germany:                { attack: 1.35, defense: 0.70 },
  Portugal:               { attack: 1.38, defense: 0.70 },
  Netherlands:            { attack: 1.32, defense: 0.72 },
  Holland:                { attack: 1.32, defense: 0.72 },
  // Strong tier
  Belgium:                { attack: 1.22, defense: 0.80 },
  Croatia:                { attack: 1.18, defense: 0.80 },
  Italy:                  { attack: 1.20, defense: 0.75 },
  Uruguay:                { attack: 1.22, defense: 0.82 },
  Morocco:                { attack: 1.12, defense: 0.78 },
  Colombia:               { attack: 1.18, defense: 0.88 },
  Denmark:                { attack: 1.12, defense: 0.82 },
  Switzerland:            { attack: 1.10, defense: 0.83 },
  Austria:                { attack: 1.15, defense: 0.85 },
  Norway:                 { attack: 1.18, defense: 0.85 },
  Turkey:                 { attack: 1.05, defense: 0.95 },
  Serbia:                 { attack: 1.05, defense: 0.95 },
  // Medium tier
  USA:                    { attack: 1.05, defense: 0.95 },
  Mexico:                 { attack: 1.08, defense: 0.95 },
  Canada:                 { attack: 1.05, defense: 0.97 },
  Japan:                  { attack: 1.05, defense: 0.93 },
  "South Korea":          { attack: 1.00, defense: 0.98 },
  "Korea Republic":       { attack: 1.00, defense: 0.98 },
  Senegal:                { attack: 1.08, defense: 0.92 },
  Australia:              { attack: 0.92, defense: 1.02 },
  Poland:                 { attack: 0.98, defense: 1.00 },
  Sweden:                 { attack: 1.05, defense: 0.90 },
  Ecuador:                { attack: 0.98, defense: 1.00 },
  "Ivory Coast":          { attack: 1.00, defense: 1.02 },
  "Cote d'Ivoire":        { attack: 1.00, defense: 1.02 },
  Venezuela:              { attack: 0.95, defense: 1.05 },
  Chile:                  { attack: 1.00, defense: 1.00 },
  Nigeria:                { attack: 1.00, defense: 1.05 },
  Paraguay:               { attack: 0.95, defense: 1.05 },
  Romania:                { attack: 0.90, defense: 1.05 },
  Hungary:                { attack: 0.88, defense: 1.08 },
  Greece:                 { attack: 0.88, defense: 1.08 },
  Slovakia:               { attack: 0.88, defense: 1.08 },
  "Czech Republic":       { attack: 0.95, defense: 1.02 },
  Czechia:                { attack: 0.95, defense: 1.02 },
  // Weaker tier
  "Saudi Arabia":         { attack: 0.88, defense: 1.12 },
  Iran:                   { attack: 0.85, defense: 1.10 },
  Iraq:                   { attack: 0.82, defense: 1.15 },
  Egypt:                  { attack: 0.88, defense: 1.08 },
  Tunisia:                { attack: 0.85, defense: 1.12 },
  Algeria:                { attack: 0.90, defense: 1.08 },
  Cameroon:               { attack: 0.90, defense: 1.10 },
  "South Africa":         { attack: 0.85, defense: 1.15 },
  Mali:                   { attack: 0.85, defense: 1.15 },
  Panama:                 { attack: 0.80, defense: 1.18 },
  "Costa Rica":           { attack: 0.82, defense: 1.15 },
  Honduras:               { attack: 0.78, defense: 1.20 },
  Jordan:                 { attack: 0.80, defense: 1.20 },
  Uzbekistan:             { attack: 0.82, defense: 1.18 },
  "New Zealand":          { attack: 0.75, defense: 1.25 },
  "Cape Verde":           { attack: 0.80, defense: 1.20 },
  "Congo DR":             { attack: 0.82, defense: 1.18 },
  "DR Congo":             { attack: 0.82, defense: 1.18 },
  Scotland:               { attack: 0.92, defense: 1.05 },
  Wales:                  { attack: 0.88, defense: 1.08 },
  "Republic of Ireland":  { attack: 0.85, defense: 1.10 },
  Ireland:                { attack: 0.85, defense: 1.10 },
  Slovenia:               { attack: 0.88, defense: 1.10 },
  Albania:                { attack: 0.83, defense: 1.15 },
  Qatar:                  { attack: 0.80, defense: 1.20 },
};

const AVERAGE_STRENGTH = { attack: 1.0, defense: 1.0 };

function getStrength(teamName: string): { attack: number; defense: number } {
  if (TEAM_STRENGTH[teamName]) return TEAM_STRENGTH[teamName];
  const lower = teamName.toLowerCase();
  const key = Object.keys(TEAM_STRENGTH).find(k => k.toLowerCase() === lower);
  return key ? TEAM_STRENGTH[key] : AVERAGE_STRENGTH;
}

/** Poisson PMF: P(X = k | lambda). */
function poissonPMF(lambda: number, k: number): number {
  if (k < 0 || lambda <= 0) return 0;
  let logP = -lambda + k * Math.log(Math.max(lambda, 1e-10));
  for (let i = 1; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

/**
 * Dixon-Coles τ correction: applied only at (0,0),(1,0),(0,1),(1,1).
 */
function tauDC(i: number, j: number, mu1: number, mu2: number, rho: number): number {
  if (i === 0 && j === 0) return 1 - mu1 * mu2 * rho;
  if (i === 1 && j === 0) return 1 + mu2 * rho;
  if (i === 0 && j === 1) return 1 + mu1 * rho;
  if (i === 1 && j === 1) return 1 - rho;
  return 1;
}

export interface MatchProbabilities {
  muHome: number;
  muAway: number;
  probWin: number;
  probDraw: number;
  probLoss: number;
  /** P(teamA keeps clean sheet — teamB scores 0). */
  probCleanSheetHome: number;
  probCleanSheetAway: number;
}

/**
 * Compute match outcome probabilities using Dixon-Coles.
 * teamA is treated as home (pass homeAdv=1 for WC neutral venues).
 */
export function matchProbabilities(
  teamA: string,
  teamB: string,
  homeAdv = 1.0
): MatchProbabilities {
  const sA = getStrength(teamA);
  const sB = getStrength(teamB);

  const muHome = BASE_XG * sA.attack * sB.defense * homeAdv;
  const muAway = BASE_XG * sB.attack * sA.defense;

  let probWin = 0, probDraw = 0, probLoss = 0;
  let probCSHome = 0, probCSAway = 0;

  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const p =
        tauDC(i, j, muHome, muAway, RHO) *
        poissonPMF(muHome, i) *
        poissonPMF(muAway, j);
      if (i > j) probWin += p;
      else if (i === j) probDraw += p;
      else probLoss += p;
      if (j === 0) probCSHome += p;
      if (i === 0) probCSAway += p;
    }
  }

  return {
    muHome: +muHome.toFixed(3),
    muAway: +muAway.toFixed(3),
    probWin: +probWin.toFixed(4),
    probDraw: +probDraw.toFixed(4),
    probLoss: +probLoss.toFixed(4),
    probCleanSheetHome: +probCSHome.toFixed(4),
    probCleanSheetAway: +probCSAway.toFixed(4),
  };
}

/**
 * Map a team's attack strength to the coarse OpponentTier used by existing callers.
 */
export function teamToOpponentTier(opponentName: string): OpponentTier {
  const s = getStrength(opponentName);
  if (s.attack >= 1.3) return "elite";
  if (s.attack >= 1.10) return "strong";
  if (s.attack >= 0.90) return "medium";
  return "weak";
}

/**
 * Build a FixtureDifficulty from team names using the Dixon-Coles model.
 * teamA = the player's team, teamB = opponent.
 */
export function buildFixtureDifficultyFromStrength(
  teamA: string,
  teamB: string,
  fixtureId?: string,
  homeAdv = 1.0
): FixtureDifficulty {
  const mp = matchProbabilities(teamA, teamB, homeAdv);
  return {
    fixtureId,
    opponent: teamB,
    tier: teamToOpponentTier(teamB),
    probWin: mp.probWin,
    probDraw: mp.probDraw,
    probLoss: mp.probLoss,
    xGFor: mp.muHome,
    xGAgainst: mp.muAway,
    probCleanSheet: mp.probCleanSheetHome,
  };
}
