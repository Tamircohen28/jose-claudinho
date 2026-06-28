/**
 * Official FIFA World Cup 2026 knockout schedule (R32 → Final).
 *
 * **What "embedded" means:** these fixtures live in the plugin source (like the
 * 72 group-stage rows in wc2026Schedule.ts), not from a live API. External feeds
 * (TheSportsDB, API-Football) are tried only to *enrich scores* when available;
 * they do not drive the schedule. Update this file when FIFA publishes results
 * or if kickoff times shift.
 *
 * R32 rows use confirmed team names. Later rounds use bracket slots
 * ("Winner Match 73") until results propagate — see resolveKnockoutBracket().
 *
 * Round ids (TheSportsDB convention): 4=R32, 5=R16, 6=QF, 7=SF/Final/3rd.
 */

export type KnockoutStage = "r32" | "r16" | "qf" | "sf" | "third" | "final";

export interface Wc2026KnockoutFixture {
  matchNumber: number;
  stage: KnockoutStage;
  /** TheSportsDB-style round bucket (4–7). */
  round: 4 | 5 | 6 | 7;
  date: string;
  /** Local kickoff HH:MM:SS (venue timezone). */
  time: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  /** Bracket feed: home side comes from winner of this R32+ match (if known). */
  homeFromMatch?: number;
  awayFromMatch?: number;
}

function w(m: number): string {
  return `Winner Match ${m}`;
}

function l(m: number): string {
  return `Loser Match ${m}`;
}

/** Round of 32 — 16 ties (teams confirmed after MD3). */
export const WC2026_R32_FIXTURES: Wc2026KnockoutFixture[] = [
  { matchNumber: 73, stage: "r32", round: 4, date: "2026-06-28", time: "12:00:00", homeTeam: "South Africa", awayTeam: "Canada", homeScore: null, awayScore: null, venue: "SoFi Stadium, Inglewood" },
  { matchNumber: 76, stage: "r32", round: 4, date: "2026-06-29", time: "12:00:00", homeTeam: "Brazil", awayTeam: "Japan", homeScore: null, awayScore: null, venue: "NRG Stadium, Houston" },
  { matchNumber: 74, stage: "r32", round: 4, date: "2026-06-29", time: "16:30:00", homeTeam: "Germany", awayTeam: "Paraguay", homeScore: null, awayScore: null, venue: "Gillette Stadium, Foxborough" },
  { matchNumber: 75, stage: "r32", round: 4, date: "2026-06-29", time: "19:00:00", homeTeam: "Netherlands", awayTeam: "Morocco", homeScore: null, awayScore: null, venue: "Estadio BBVA, Guadalupe" },
  { matchNumber: 78, stage: "r32", round: 4, date: "2026-06-30", time: "12:00:00", homeTeam: "Ivory Coast", awayTeam: "Norway", homeScore: null, awayScore: null, venue: "AT&T Stadium, Arlington" },
  { matchNumber: 77, stage: "r32", round: 4, date: "2026-06-30", time: "17:00:00", homeTeam: "France", awayTeam: "Sweden", homeScore: null, awayScore: null, venue: "MetLife Stadium, East Rutherford" },
  { matchNumber: 79, stage: "r32", round: 4, date: "2026-06-30", time: "19:00:00", homeTeam: "Mexico", awayTeam: "Ecuador", homeScore: null, awayScore: null, venue: "Estadio Azteca, Mexico City" },
  { matchNumber: 80, stage: "r32", round: 4, date: "2026-07-01", time: "12:00:00", homeTeam: "England", awayTeam: "DR Congo", homeScore: null, awayScore: null, venue: "Mercedes-Benz Stadium, Atlanta" },
  { matchNumber: 82, stage: "r32", round: 4, date: "2026-07-01", time: "13:00:00", homeTeam: "Belgium", awayTeam: "Senegal", homeScore: null, awayScore: null, venue: "Lumen Field, Seattle" },
  { matchNumber: 81, stage: "r32", round: 4, date: "2026-07-01", time: "17:00:00", homeTeam: "United States", awayTeam: "Bosnia and Herzegovina", homeScore: null, awayScore: null, venue: "Levi's Stadium, Santa Clara" },
  { matchNumber: 84, stage: "r32", round: 4, date: "2026-07-02", time: "12:00:00", homeTeam: "Spain", awayTeam: "Austria", homeScore: null, awayScore: null, venue: "SoFi Stadium, Inglewood" },
  { matchNumber: 83, stage: "r32", round: 4, date: "2026-07-02", time: "19:00:00", homeTeam: "Portugal", awayTeam: "Croatia", homeScore: null, awayScore: null, venue: "BMO Field, Toronto" },
  { matchNumber: 85, stage: "r32", round: 4, date: "2026-07-02", time: "20:00:00", homeTeam: "Switzerland", awayTeam: "Algeria", homeScore: null, awayScore: null, venue: "BC Place, Vancouver" },
  { matchNumber: 88, stage: "r32", round: 4, date: "2026-07-03", time: "13:00:00", homeTeam: "Australia", awayTeam: "Egypt", homeScore: null, awayScore: null, venue: "AT&T Stadium, Arlington" },
  { matchNumber: 86, stage: "r32", round: 4, date: "2026-07-03", time: "18:00:00", homeTeam: "Argentina", awayTeam: "Cape Verde", homeScore: null, awayScore: null, venue: "Hard Rock Stadium, Miami Gardens" },
  { matchNumber: 87, stage: "r32", round: 4, date: "2026-07-03", time: "20:30:00", homeTeam: "Colombia", awayTeam: "Ghana", homeScore: null, awayScore: null, venue: "Arrowhead Stadium, Kansas City" },
];

/** Round of 16 — 8 ties (Jul 4–7). Teams = winners of listed R32 matches. */
export const WC2026_R16_FIXTURES: Wc2026KnockoutFixture[] = [
  { matchNumber: 90, stage: "r16", round: 5, date: "2026-07-04", time: "12:00:00", homeTeam: w(73), awayTeam: w(75), homeFromMatch: 73, awayFromMatch: 75, homeScore: null, awayScore: null, venue: "NRG Stadium, Houston" },
  { matchNumber: 89, stage: "r16", round: 5, date: "2026-07-04", time: "17:00:00", homeTeam: w(74), awayTeam: w(77), homeFromMatch: 74, awayFromMatch: 77, homeScore: null, awayScore: null, venue: "Lincoln Financial Field, Philadelphia" },
  { matchNumber: 91, stage: "r16", round: 5, date: "2026-07-05", time: "16:00:00", homeTeam: w(76), awayTeam: w(78), homeFromMatch: 76, awayFromMatch: 78, homeScore: null, awayScore: null, venue: "MetLife Stadium, East Rutherford" },
  { matchNumber: 92, stage: "r16", round: 5, date: "2026-07-05", time: "18:00:00", homeTeam: w(79), awayTeam: w(80), homeFromMatch: 79, awayFromMatch: 80, homeScore: null, awayScore: null, venue: "Estadio Azteca, Mexico City" },
  { matchNumber: 93, stage: "r16", round: 5, date: "2026-07-06", time: "14:00:00", homeTeam: w(83), awayTeam: w(84), homeFromMatch: 83, awayFromMatch: 84, homeScore: null, awayScore: null, venue: "AT&T Stadium, Arlington" },
  { matchNumber: 94, stage: "r16", round: 5, date: "2026-07-06", time: "17:00:00", homeTeam: w(81), awayTeam: w(82), homeFromMatch: 81, awayFromMatch: 82, homeScore: null, awayScore: null, venue: "Lumen Field, Seattle" },
  { matchNumber: 95, stage: "r16", round: 5, date: "2026-07-07", time: "12:00:00", homeTeam: w(86), awayTeam: w(88), homeFromMatch: 86, awayFromMatch: 88, homeScore: null, awayScore: null, venue: "Mercedes-Benz Stadium, Atlanta" },
  { matchNumber: 96, stage: "r16", round: 5, date: "2026-07-07", time: "13:00:00", homeTeam: w(85), awayTeam: w(87), homeFromMatch: 85, awayFromMatch: 87, homeScore: null, awayScore: null, venue: "BC Place, Vancouver" },
];

/** Quarter-finals — 4 ties (Jul 9–11). */
export const WC2026_QF_FIXTURES: Wc2026KnockoutFixture[] = [
  { matchNumber: 97, stage: "qf", round: 6, date: "2026-07-09", time: "16:00:00", homeTeam: w(89), awayTeam: w(90), homeFromMatch: 89, awayFromMatch: 90, homeScore: null, awayScore: null, venue: "Gillette Stadium, Foxborough" },
  { matchNumber: 98, stage: "qf", round: 6, date: "2026-07-10", time: "12:00:00", homeTeam: w(93), awayTeam: w(94), homeFromMatch: 93, awayFromMatch: 94, homeScore: null, awayScore: null, venue: "SoFi Stadium, Inglewood" },
  { matchNumber: 99, stage: "qf", round: 6, date: "2026-07-11", time: "17:00:00", homeTeam: w(91), awayTeam: w(92), homeFromMatch: 91, awayFromMatch: 92, homeScore: null, awayScore: null, venue: "Hard Rock Stadium, Miami Gardens" },
  { matchNumber: 100, stage: "qf", round: 6, date: "2026-07-11", time: "20:00:00", homeTeam: w(95), awayTeam: w(96), homeFromMatch: 95, awayFromMatch: 96, homeScore: null, awayScore: null, venue: "Arrowhead Stadium, Kansas City" },
];

/** Semi-finals — 2 ties (Jul 14–15). */
export const WC2026_SF_FIXTURES: Wc2026KnockoutFixture[] = [
  { matchNumber: 101, stage: "sf", round: 7, date: "2026-07-14", time: "14:00:00", homeTeam: w(97), awayTeam: w(98), homeFromMatch: 97, awayFromMatch: 98, homeScore: null, awayScore: null, venue: "AT&T Stadium, Arlington" },
  { matchNumber: 102, stage: "sf", round: 7, date: "2026-07-15", time: "15:00:00", homeTeam: w(99), awayTeam: w(100), homeFromMatch: 99, awayFromMatch: 100, homeScore: null, awayScore: null, venue: "Mercedes-Benz Stadium, Atlanta" },
];

/** Third-place play-off (Jul 18). */
export const WC2026_THIRD_FIXTURE: Wc2026KnockoutFixture = {
  matchNumber: 103,
  stage: "third",
  round: 7,
  date: "2026-07-18",
  time: "17:00:00",
  homeTeam: l(101),
  awayTeam: l(102),
  homeFromMatch: 101,
  awayFromMatch: 102,
  homeScore: null,
  awayScore: null,
  venue: "Hard Rock Stadium, Miami Gardens",
};

/** Final (Jul 19). */
export const WC2026_FINAL_FIXTURE: Wc2026KnockoutFixture = {
  matchNumber: 104,
  stage: "final",
  round: 7,
  date: "2026-07-19",
  time: "15:00:00",
  homeTeam: w(101),
  awayTeam: w(102),
  homeFromMatch: 101,
  awayFromMatch: 102,
  homeScore: null,
  awayScore: null,
  venue: "MetLife Stadium, East Rutherford",
};

/** All 32 knockout ties (R32 through Final, incl. 3rd-place). */
export const WC2026_KNOCKOUT_FIXTURES: Wc2026KnockoutFixture[] = [
  ...WC2026_R32_FIXTURES,
  ...WC2026_R16_FIXTURES,
  ...WC2026_QF_FIXTURES,
  ...WC2026_SF_FIXTURES,
  WC2026_THIRD_FIXTURE,
  WC2026_FINAL_FIXTURE,
];

/**
 * Given played knockout results (matchNumber → winning team name), fill in
 * team names for downstream bracket slots. Returns a new array; does not mutate input.
 */
export function resolveKnockoutBracket(
  fixtures: Wc2026KnockoutFixture[] = WC2026_KNOCKOUT_FIXTURES
): Wc2026KnockoutFixture[] {
  const winners = new Map<number, string>();
  const losers = new Map<number, string>();

  for (const f of fixtures) {
    if (f.homeScore != null && f.awayScore != null && f.homeScore !== f.awayScore) {
      const homeWon = f.homeScore > f.awayScore;
      winners.set(
        f.matchNumber,
        homeWon ? f.homeTeam : f.awayTeam
      );
      losers.set(
        f.matchNumber,
        homeWon ? f.awayTeam : f.homeTeam
      );
    }
  }

  return fixtures.map((f) => {
    let home = f.homeTeam;
    let away = f.awayTeam;

    if (f.homeFromMatch != null) {
      if (home.startsWith("Winner ")) home = winners.get(f.homeFromMatch) ?? home;
      if (home.startsWith("Loser ")) home = losers.get(f.homeFromMatch) ?? home;
    }
    if (f.awayFromMatch != null) {
      if (away.startsWith("Winner ")) away = winners.get(f.awayFromMatch) ?? away;
      if (away.startsWith("Loser ")) away = losers.get(f.awayFromMatch) ?? away;
    }

    if (home === f.homeTeam && away === f.awayTeam) return f;
    return { ...f, homeTeam: home, awayTeam: away };
  });
}
