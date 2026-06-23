/**
 * Official FIFA World Cup 2026 group-stage schedule (72 fixtures, MD1–MD3).
 * Source: FIFA / Wikipedia group-stage draw (June 2026).
 * Scores merged at runtime from TheSportsDB when available.
 */

export interface Wc2026GroupFixture {
  matchNumber: number | null;
  round: 1 | 2 | 3;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
}

export const WC2026_GROUP_FIXTURES: Wc2026GroupFixture[] = [
  { matchNumber: null, round: 1, date: "2026-06-11", homeTeam: "Mexico", awayTeam: "South Africa", homeScore: 2, awayScore: 0 },
  { matchNumber: null, round: 1, date: "2026-06-11", homeTeam: "South Korea", awayTeam: "Czech Republic", homeScore: 2, awayScore: 1 },
  { matchNumber: null, round: 2, date: "2026-06-18", homeTeam: "Czech Republic", awayTeam: "South Africa", homeScore: 1, awayScore: 1 },
  { matchNumber: null, round: 2, date: "2026-06-18", homeTeam: "Mexico", awayTeam: "South Korea", homeScore: 1, awayScore: 0 },
  { matchNumber: 53, round: 3, date: "2026-06-24", homeTeam: "Czech Republic", awayTeam: "Mexico", homeScore: null, awayScore: null },
  { matchNumber: 54, round: 3, date: "2026-06-24", homeTeam: "South Africa", awayTeam: "South Korea", homeScore: null, awayScore: null },
  { matchNumber: null, round: 1, date: "2026-06-12", homeTeam: "Canada", awayTeam: "Bosnia and Herzegovina", homeScore: 1, awayScore: 1 },
  { matchNumber: null, round: 1, date: "2026-06-13", homeTeam: "Qatar", awayTeam: "Switzerland", homeScore: 1, awayScore: 1 },
  { matchNumber: null, round: 2, date: "2026-06-18", homeTeam: "Switzerland", awayTeam: "Bosnia and Herzegovina", homeScore: 4, awayScore: 1 },
  { matchNumber: null, round: 2, date: "2026-06-18", homeTeam: "Canada", awayTeam: "Qatar", homeScore: 6, awayScore: 0 },
  { matchNumber: 51, round: 3, date: "2026-06-24", homeTeam: "Switzerland", awayTeam: "Canada", homeScore: null, awayScore: null },
  { matchNumber: 52, round: 3, date: "2026-06-24", homeTeam: "Bosnia and Herzegovina", awayTeam: "Qatar", homeScore: null, awayScore: null },
  { matchNumber: null, round: 1, date: "2026-06-13", homeTeam: "Brazil", awayTeam: "Morocco", homeScore: 1, awayScore: 1 },
  { matchNumber: null, round: 1, date: "2026-06-13", homeTeam: "Haiti", awayTeam: "Scotland", homeScore: 0, awayScore: 1 },
  { matchNumber: null, round: 2, date: "2026-06-19", homeTeam: "Scotland", awayTeam: "Morocco", homeScore: 0, awayScore: 1 },
  { matchNumber: null, round: 2, date: "2026-06-19", homeTeam: "Brazil", awayTeam: "Haiti", homeScore: 3, awayScore: 0 },
  { matchNumber: 49, round: 3, date: "2026-06-24", homeTeam: "Scotland", awayTeam: "Brazil", homeScore: null, awayScore: null },
  { matchNumber: 50, round: 3, date: "2026-06-24", homeTeam: "Morocco", awayTeam: "Haiti", homeScore: null, awayScore: null },
  { matchNumber: null, round: 1, date: "2026-06-12", homeTeam: "United States", awayTeam: "Paraguay", homeScore: 4, awayScore: 1 },
  { matchNumber: null, round: 1, date: "2026-06-13", homeTeam: "Australia", awayTeam: "Turkey", homeScore: 2, awayScore: 0 },
  { matchNumber: null, round: 2, date: "2026-06-19", homeTeam: "United States", awayTeam: "Australia", homeScore: 2, awayScore: 0 },
  { matchNumber: null, round: 2, date: "2026-06-19", homeTeam: "Turkey", awayTeam: "Paraguay", homeScore: 0, awayScore: 1 },
  { matchNumber: 59, round: 3, date: "2026-06-25", homeTeam: "Turkey", awayTeam: "United States", homeScore: null, awayScore: null },
  { matchNumber: 60, round: 3, date: "2026-06-25", homeTeam: "Paraguay", awayTeam: "Australia", homeScore: null, awayScore: null },
  { matchNumber: null, round: 1, date: "2026-06-14", homeTeam: "Germany", awayTeam: "Curaçao", homeScore: 7, awayScore: 1 },
  { matchNumber: null, round: 1, date: "2026-06-14", homeTeam: "Ivory Coast", awayTeam: "Ecuador", homeScore: 1, awayScore: 0 },
  { matchNumber: null, round: 2, date: "2026-06-20", homeTeam: "Germany", awayTeam: "Ivory Coast", homeScore: 2, awayScore: 1 },
  { matchNumber: null, round: 2, date: "2026-06-20", homeTeam: "Ecuador", awayTeam: "Curaçao", homeScore: 0, awayScore: 0 },
  { matchNumber: 55, round: 3, date: "2026-06-25", homeTeam: "Curaçao", awayTeam: "Ivory Coast", homeScore: null, awayScore: null },
  { matchNumber: 56, round: 3, date: "2026-06-25", homeTeam: "Ecuador", awayTeam: "Germany", homeScore: null, awayScore: null },
  { matchNumber: null, round: 1, date: "2026-06-14", homeTeam: "Netherlands", awayTeam: "Japan", homeScore: 2, awayScore: 2 },
  { matchNumber: null, round: 1, date: "2026-06-14", homeTeam: "Sweden", awayTeam: "Tunisia", homeScore: 5, awayScore: 1 },
  { matchNumber: null, round: 2, date: "2026-06-20", homeTeam: "Netherlands", awayTeam: "Sweden", homeScore: 5, awayScore: 1 },
  { matchNumber: null, round: 2, date: "2026-06-20", homeTeam: "Tunisia", awayTeam: "Japan", homeScore: 0, awayScore: 4 },
  { matchNumber: 57, round: 3, date: "2026-06-25", homeTeam: "Japan", awayTeam: "Sweden", homeScore: null, awayScore: null },
  { matchNumber: 58, round: 3, date: "2026-06-25", homeTeam: "Tunisia", awayTeam: "Netherlands", homeScore: null, awayScore: null },
  { matchNumber: null, round: 1, date: "2026-06-15", homeTeam: "Belgium", awayTeam: "Egypt", homeScore: 1, awayScore: 1 },
  { matchNumber: null, round: 1, date: "2026-06-15", homeTeam: "Iran", awayTeam: "New Zealand", homeScore: 2, awayScore: 2 },
  { matchNumber: null, round: 2, date: "2026-06-21", homeTeam: "Belgium", awayTeam: "Iran", homeScore: 0, awayScore: 0 },
  { matchNumber: null, round: 2, date: "2026-06-21", homeTeam: "New Zealand", awayTeam: "Egypt", homeScore: 1, awayScore: 3 },
  { matchNumber: 63, round: 3, date: "2026-06-26", homeTeam: "Egypt", awayTeam: "Iran", homeScore: null, awayScore: null },
  { matchNumber: 64, round: 3, date: "2026-06-26", homeTeam: "New Zealand", awayTeam: "Belgium", homeScore: null, awayScore: null },
  { matchNumber: null, round: 1, date: "2026-06-15", homeTeam: "Spain", awayTeam: "Cape Verde", homeScore: 0, awayScore: 0 },
  { matchNumber: null, round: 1, date: "2026-06-15", homeTeam: "Saudi Arabia", awayTeam: "Uruguay", homeScore: 1, awayScore: 1 },
  { matchNumber: null, round: 2, date: "2026-06-21", homeTeam: "Spain", awayTeam: "Saudi Arabia", homeScore: 4, awayScore: 0 },
  { matchNumber: null, round: 2, date: "2026-06-21", homeTeam: "Uruguay", awayTeam: "Cape Verde", homeScore: 2, awayScore: 2 },
  { matchNumber: 65, round: 3, date: "2026-06-26", homeTeam: "Cape Verde", awayTeam: "Saudi Arabia", homeScore: null, awayScore: null },
  { matchNumber: 66, round: 3, date: "2026-06-26", homeTeam: "Uruguay", awayTeam: "Spain", homeScore: null, awayScore: null },
  { matchNumber: null, round: 1, date: "2026-06-16", homeTeam: "France", awayTeam: "Senegal", homeScore: 3, awayScore: 1 },
  { matchNumber: null, round: 1, date: "2026-06-16", homeTeam: "Iraq", awayTeam: "Norway", homeScore: 1, awayScore: 4 },
  { matchNumber: null, round: 2, date: "2026-06-22", homeTeam: "France", awayTeam: "Iraq", homeScore: 3, awayScore: 0 },
  { matchNumber: null, round: 2, date: "2026-06-22", homeTeam: "Norway", awayTeam: "Senegal", homeScore: 3, awayScore: 2 },
  { matchNumber: 61, round: 3, date: "2026-06-26", homeTeam: "Norway", awayTeam: "France", homeScore: null, awayScore: null },
  { matchNumber: 62, round: 3, date: "2026-06-26", homeTeam: "Senegal", awayTeam: "Iraq", homeScore: null, awayScore: null },
  { matchNumber: null, round: 1, date: "2026-06-16", homeTeam: "Argentina", awayTeam: "Algeria", homeScore: 3, awayScore: 0 },
  { matchNumber: null, round: 1, date: "2026-06-16", homeTeam: "Austria", awayTeam: "Jordan", homeScore: 3, awayScore: 1 },
  { matchNumber: null, round: 2, date: "2026-06-22", homeTeam: "Argentina", awayTeam: "Austria", homeScore: 2, awayScore: 0 },
  { matchNumber: null, round: 2, date: "2026-06-22", homeTeam: "Jordan", awayTeam: "Algeria", homeScore: 1, awayScore: 2 },
  { matchNumber: 69, round: 3, date: "2026-06-27", homeTeam: "Algeria", awayTeam: "Austria", homeScore: null, awayScore: null },
  { matchNumber: 70, round: 3, date: "2026-06-27", homeTeam: "Jordan", awayTeam: "Argentina", homeScore: null, awayScore: null },
  { matchNumber: null, round: 1, date: "2026-06-17", homeTeam: "Portugal", awayTeam: "DR Congo", homeScore: 1, awayScore: 1 },
  { matchNumber: null, round: 1, date: "2026-06-17", homeTeam: "Uzbekistan", awayTeam: "Colombia", homeScore: 1, awayScore: 3 },
  { matchNumber: null, round: 2, date: "2026-06-23", homeTeam: "Portugal", awayTeam: "Uzbekistan", homeScore: 5, awayScore: 0 },
  { matchNumber: 48, round: 2, date: "2026-06-23", homeTeam: "Colombia", awayTeam: "DR Congo", homeScore: null, awayScore: null },
  { matchNumber: 71, round: 3, date: "2026-06-27", homeTeam: "Colombia", awayTeam: "Portugal", homeScore: null, awayScore: null },
  { matchNumber: 72, round: 3, date: "2026-06-27", homeTeam: "DR Congo", awayTeam: "Uzbekistan", homeScore: null, awayScore: null },
  { matchNumber: null, round: 1, date: "2026-06-17", homeTeam: "England", awayTeam: "Croatia", homeScore: 4, awayScore: 2 },
  { matchNumber: null, round: 1, date: "2026-06-17", homeTeam: "Ghana", awayTeam: "Panama", homeScore: 1, awayScore: 0 },
  { matchNumber: 45, round: 2, date: "2026-06-23", homeTeam: "England", awayTeam: "Ghana", homeScore: null, awayScore: null },
  { matchNumber: 46, round: 2, date: "2026-06-23", homeTeam: "Panama", awayTeam: "Croatia", homeScore: null, awayScore: null },
  { matchNumber: 67, round: 3, date: "2026-06-27", homeTeam: "Panama", awayTeam: "England", homeScore: null, awayScore: null },
  { matchNumber: 68, round: 3, date: "2026-06-27", homeTeam: "Croatia", awayTeam: "Ghana", homeScore: null, awayScore: null },
];
