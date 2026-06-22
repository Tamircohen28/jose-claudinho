/**
 * Static penalty-taker registry for WC 2026 national teams.
 *
 * Maps Sport5 nationTeamId → primary (and optional backup) penalty taker.
 * Player IDs are Sport5 player IDs from sport5_list_players.
 *
 * Maintained manually — international penalty takers change rarely.
 */

export interface PenaltyTakerEntry {
  nationTeamId: number;
  nationNameEn: string;
  primary: number;
  primaryName: string;
  backup?: number;
  backupName?: string;
  notes: string;
}

export const PENALTY_TAKERS: PenaltyTakerEntry[] = [
  // Europe
  {
    nationTeamId: 173, nationNameEn: "Germany",
    primary: 1971, primaryName: "Kai Havertz",
    backup: 1969, backupName: "Deniz Undav",
    notes: "Havertz is Germany's designated pen taker since 2023; Undav backup",
  },
  {
    nationTeamId: 175, nationNameEn: "England",
    primary: 2027, primaryName: "Harry Kane",
    notes: "Kane is England's undisputed penalty taker — 24/26 converted for club+country",
  },
  {
    nationTeamId: 178, nationNameEn: "Portugal",
    primary: 2129, primaryName: "Bruno Fernandes",
    notes: "Bruno Fernandes took over Portugal pen duties post-Ronaldo era",
  },
  {
    nationTeamId: 180, nationNameEn: "Belgium",
    primary: 2176, primaryName: "Kevin De Bruyne",
    notes: "De Bruyne is Belgium's captain and primary pen taker",
  },
  {
    nationTeamId: 181, nationNameEn: "Netherlands",
    primary: 2208, primaryName: "Cody Gakpo",
    backup: 2184, backupName: "Virgil van Dijk",
    notes: "Gakpo took pens for Netherlands at EURO 2024; van Dijk backup",
  },
  {
    nationTeamId: 184, nationNameEn: "Switzerland",
    primary: 2670, primaryName: "Breel Embolo",
    notes: "Embolo is Switzerland's attacking focal point and pen taker",
  },
  {
    nationTeamId: 186, nationNameEn: "Spain",
    primary: 2337, primaryName: "Mikel Oyarzabal",
    backup: 2348, backupName: "Ferran Torres",
    notes: "Oyarzabal is Spain's #1 pen taker; Ferran Torres backup",
  },
  {
    nationTeamId: 188, nationNameEn: "France",
    primary: 2378, primaryName: "Kylian Mbappé",
    notes: "Mbappé is France's automatic pen taker — high conversion rate",
  },
  {
    nationTeamId: 193, nationNameEn: "Austria",
    primary: 2509, primaryName: "Marko Arnautovic",
    notes: "Arnautovic is Austria's captain and penalty taker",
  },
  {
    nationTeamId: 253, nationNameEn: "Sweden",
    primary: 5987, primaryName: "Viktor Gyökeres",
    backup: 5106, backupName: "Alexander Isak",
    notes: "Gyökeres is Sweden's #1 pen taker after Sporting breakout; Isak backup",
  },
  {
    nationTeamId: 258, nationNameEn: "Norway",
    primary: 5249, primaryName: "Erling Haaland",
    notes: "Haaland is Norway's undisputed penalty taker — 100% for Norway",
  },
  // Americas
  {
    nationTeamId: 250, nationNameEn: "Mexico",
    primary: 5027, primaryName: "Raúl Jiménez",
    notes: "Jiménez is Mexico's captain and penalty taker",
  },
  {
    nationTeamId: 251, nationNameEn: "Brazil",
    primary: 5072, primaryName: "Vinicius Jr.",
    notes: "Vinicius Jr. is Brazil's primary pen taker since Neymar's international retirement",
  },
  {
    nationTeamId: 255, nationNameEn: "Argentina",
    primary: 5155, primaryName: "Lionel Messi",
    notes: "Messi remains Argentina's penalty taker at WC 2026",
  },
  {
    nationTeamId: 257, nationNameEn: "Colombia",
    primary: 5220, primaryName: "Luis Díaz",
    notes: "Díaz is Colombia's attacking leader and primary pen taker",
  },
  {
    nationTeamId: 261, nationNameEn: "USA",
    primary: 5349, primaryName: "Christian Pulisic",
    backup: 6288, backupName: "Folarin Balogun",
    notes: "Pulisic is USA's captain and first-choice pen taker",
  },
  {
    nationTeamId: 264, nationNameEn: "Canada",
    primary: 5393, primaryName: "Jonathan David",
    backup: 5394, backupName: "Cyle Larin",
    notes: "David is Canada's penalty specialist — high club-level conversion rate",
  },
  // Africa / Asia
  {
    nationTeamId: 263, nationNameEn: "South Korea",
    primary: 5368, primaryName: "Son Heung-min",
    notes: "Son is South Korea's captain and penalty taker",
  },
  {
    nationTeamId: 265, nationNameEn: "Morocco",
    primary: 5421, primaryName: "Brahim Díaz",
    notes: "Brahim Díaz has emerged as Morocco's primary set-piece taker",
  },
  {
    nationTeamId: 267, nationNameEn: "Japan",
    primary: 5510, primaryName: "Daichi Kamada",
    notes: "Kamada is Japan's designated penalty taker",
  },
  {
    nationTeamId: 278, nationNameEn: "Egypt",
    primary: 5778, primaryName: "Mohamed Salah",
    notes: "Salah is Egypt's captain and penalty taker — exceptional conversion rate",
  },
];

export function getPenaltyTakerForNation(nationTeamId: number): PenaltyTakerEntry | undefined {
  return PENALTY_TAKERS.find((e) => e.nationTeamId === nationTeamId);
}

export function getPenaltyTakers(nationTeamIds?: number[]): PenaltyTakerEntry[] {
  if (!nationTeamIds || nationTeamIds.length === 0) return PENALTY_TAKERS;
  return PENALTY_TAKERS.filter((e) => nationTeamIds.includes(e.nationTeamId));
}
