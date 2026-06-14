/**
 * National team registry: Sport5 nationTeamId -> Hebrew name -> TheSportsDB English aliases.
 */

import type { SlimFixture } from "./fixtures.js";

export interface NationEntry {
  nationTeamId: number;
  nameHe: string;
  sportsDbNames: string[];
  flagEmoji: string | null;
}

type AliasInfo = { names: string[]; flag?: string };

/** Hebrew Sport5 name -> English names used by TheSportsDB (+ optional flag). */
export const HEBREW_ALIASES: Record<string, AliasInfo> = {
  "\u05d0\u05e8\u05d2\u05e0\u05d8\u05d9\u05e0\u05d4": { names: ["Argentina"], flag: "\u{1F1E6}\u{1F1F7}" },
  "\u05d1\u05e8\u05d6\u05d9\u05dc": { names: ["Brazil"], flag: "\u{1F1E7}\u{1F1F7}" },
  "\u05e6\u05e8\u05e4\u05ea": { names: ["France"], flag: "\u{1F1EB}\u{1F1F7}" },
  "\u05d0\u05e0\u05d2\u05dc\u05d9\u05d4": { names: ["England"], flag: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E007F}" },
  "\u05e1\u05e4\u05e8\u05d3": { names: ["Spain"], flag: "\u{1F1EA}\u{1F1F8}" },
  "\u05d2\u05e8\u05de\u05e0\u05d9\u05d4": { names: ["Germany"], flag: "\u{1F1E9}\u{1F1EA}" },
  "\u05e4\u05d5\u05e8\u05d8\u05d5\u05d2\u05dc": { names: ["Portugal"], flag: "\u{1F1F5}\u{1F1F9}" },
  "\u05d4\u05d5\u05dc\u05e0\u05d3": { names: ["Netherlands", "Holland"], flag: "\u{1F1F3}\u{1F1F1}" },
  "\u05d1\u05dc\u05d2\u05d9\u05d4": { names: ["Belgium"], flag: "\u{1F1E7}\u{1F1EA}" },
  "\u05d0\u05d9\u05d8\u05dc\u05d9\u05d4": { names: ["Italy"], flag: "\u{1F1EE}\u{1F1F9}" },
  "\u05e7\u05e8\u05d5\u05d0\u05d8\u05d9\u05d4": { names: ["Croatia"], flag: "\u{1F1ED}\u{1F1F7}" },
  "\u05d0\u05d5\u05e8\u05d5\u05d2\u05d5\u05d0\u05d9": { names: ["Uruguay"], flag: "\u{1F1FA}\u{1F1FE}" },
  "\u05e7\u05d5\u05dc\u05d5\u05de\u05d1\u05d9\u05d4": { names: ["Colombia"], flag: "\u{1F1E8}\u{1F1F4}" },
  "\u05de\u05e7\u05e1\u05d9\u05e7\u05d5": { names: ["Mexico"], flag: "\u{1F1F2}\u{1F1FD}" },
  "\u05e7\u05e0\u05d3\u05d4": { names: ["Canada"], flag: "\u{1F1E8}\u{1F1E6}" },
  "\u05de\u05e8\u05d5\u05e7\u05d5": { names: ["Morocco"], flag: "\u{1F1F2}\u{1F1E6}" },
  "\u05d9\u05e4\u05df": { names: ["Japan"], flag: "\u{1F1EF}\u{1F1F5}" },
  "\u05d3\u05e8\u05d5\u05dd \u05e7\u05d5\u05e8\u05d9\u05d0\u05d4": { names: ["South Korea", "Korea Republic"], flag: "\u{1F1F0}\u{1F1F7}" },
  "\u05d0\u05d5\u05e1\u05d8\u05e8\u05dc\u05d9\u05d4": { names: ["Australia"], flag: "\u{1F1E6}\u{1F1FA}" },
  "\u05e9\u05d5\u05d5\u05d9\u05e5": { names: ["Switzerland"], flag: "\u{1F1E8}\u{1F1ED}" },
  "\u05d3\u05e0\u05de\u05e8\u05e7": { names: ["Denmark"], flag: "\u{1F1E9}\u{1F1F0}" },
  "\u05e9\u05d5\u05d5\u05d3\u05d9\u05d4": { names: ["Sweden"], flag: "\u{1F1F8}\u{1F1EA}" },
  "\u05e4\u05d5\u05dc\u05d9\u05df": { names: ["Poland"], flag: "\u{1F1F5}\u{1F1F1}" },
  "\u05e1\u05e0\u05d2\u05dc": { names: ["Senegal"], flag: "\u{1F1F8}\u{1F1F3}" },
  "\u05de\u05e6\u05e8\u05d9\u05dd": { names: ["Egypt"], flag: "\u{1F1EA}\u{1F1EC}" },
  "\u05d0\u05dc\u05d2\u05f3\u05d9\u05e8\u05d9\u05d4": { names: ["Algeria"], flag: "\u{1F1E9}\u{1F1FF}" },
  "\u05d8\u05d5\u05e0\u05d9\u05d6\u05d9\u05d4": { names: ["Tunisia"], flag: "\u{1F1F9}\u{1F1F3}" },
  "\u05e1\u05e2\u05d5\u05d3\u05d9\u05d4": { names: ["Saudi Arabia"], flag: "\u{1F1F8}\u{1F1E6}" },
  "\u05d0\u05d9\u05e8\u05d0\u05df": { names: ["Iran"], flag: "\u{1F1EE}\u{1F1F7}" },
  "\u05e2\u05d9\u05e8\u05d0\u05e7": { names: ["Iraq"], flag: "\u{1F1EE}\u{1F1F6}" },
  "\u05d0\u05d5\u05e1\u05d8\u05e8\u05d9\u05d4": { names: ["Austria"], flag: "\u{1F1E6}\u{1F1F9}" },
  "\u05e0\u05d5\u05e8\u05d5\u05d5\u05d2\u05d9\u05d4": { names: ["Norway"], flag: "\u{1F1F3}\u{1F1F4}" },
  "\u05d0\u05e7\u05d5\u05d5\u05d3\u05d5\u05e8": { names: ["Ecuador"], flag: "\u{1F1EA}\u{1F1E8}" },
  "\u05d7\u05d5\u05e3 \u05d4\u05e9\u05df": { names: ["Ivory Coast", "Cote d'Ivoire"], flag: "\u{1F1E8}\u{1F1EE}" },
  "\u05db\u05e3 \u05d5\u05e8\u05d3\u05d4": { names: ["Cape Verde"], flag: "\u{1F1E8}\u{1F1FB}" },
  "\u05d0\u05d5\u05d6\u05d1\u05e7\u05d9\u05e1\u05d8\u05df": { names: ["Uzbekistan"], flag: "\u{1F1FA}\u{1F1FF}" },
  "\u05e0\u05d9\u05d5 \u05d6\u05d9\u05dc\u05e0\u05d3": { names: ["New Zealand"], flag: "\u{1F1F3}\u{1F1FF}" },
  "\u05d9\u05e8\u05d3\u05df": { names: ["Jordan"], flag: "\u{1F1EF}\u{1F1F4}" },
  "\u05e7\u05d5\u05e0\u05d2\u05d5": { names: ["Congo DR", "DR Congo"], flag: "\u{1F1E8}\u{1F1E9}" },
  "\u05d0\u05d9\u05e8\u05dc\u05e0\u05d3": { names: ["Republic of Ireland", "Ireland"], flag: "\u{1F1EE}\u{1F1EA}" },
  "\u05e1\u05db\u05d5\u05dd": { names: ["Scotland"], flag: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}" },
  "\u05d5\u05d5\u05dc\u05d9\u05d6": { names: ["Wales"], flag: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}" },
  "\u05e6\u05f3\u05d0\u05d3\u05d4": { names: ["Czech Republic", "Czechia"], flag: "\u{1F1E8}\u{1F1FF}" },
  "\u05e8\u05d5\u05de\u05e0\u05d9\u05d4": { names: ["Romania"], flag: "\u{1F1F7}\u{1F1F4}" },
  "\u05d0\u05d5\u05e7\u05e8\u05d0\u05d9\u05e0\u05d4": { names: ["Ukraine"], flag: "\u{1F1FA}\u{1F1E6}" },
  "\u05e7\u05d5\u05e1\u05d8\u05d4 \u05e8\u05d9\u05e7\u05d4": { names: ["Costa Rica"], flag: "\u{1F1E8}\u{1F1F7}" },
  "\u05e4\u05e8\u05d2\u05d5\u05d0\u05d9": { names: ["Paraguay"], flag: "\u{1F1F5}\u{1F1FE}" },
  "\u05e6\u05f3\u05d9\u05dc\u05d9": { names: ["Chile"], flag: "\u{1F1E8}\u{1F1F1}" },
  "\u05e4\u05e8\u05d5": { names: ["Peru"], flag: "\u{1F1F5}\u{1F1EA}" },
  "\u05d5\u05e0\u05e6\u05d5\u05d0\u05dc\u05d4": { names: ["Venezuela"], flag: "\u{1F1FB}\u{1F1EA}" },
  "\u05d0\u05d9\u05e7\u05d5\u05d0\u05d3\u05d5\u05e8": { names: ["Ecuador"], flag: "\u{1F1EA}\u{1F1E8}" },
  "\u05d0\u05e8\u05d4\u05f4\u05d1": { names: ["United States", "USA"], flag: "\u{1F1FA}\u{1F1F8}" },
  "\u05d0\u05e8\u05e6\u05d5\u05ea \u05d4\u05d1\u05e8\u05d9\u05ea": { names: ["United States", "USA"], flag: "\u{1F1FA}\u{1F1F8}" },
  "\u05d8\u05d5\u05e8\u05e7\u05d9\u05d4": { names: ["Turkey", "Turkiye"], flag: "\u{1F1F9}\u{1F1F7}" },
  "\u05e1\u05e8\u05d1\u05d9\u05d4": { names: ["Serbia"], flag: "\u{1F1F7}\u{1F1F8}" },
  "\u05d9\u05d5\u05d5\u05df": { names: ["Greece"], flag: "\u{1F1EC}\u{1F1F7}" },
  "\u05d4\u05d5\u05e0\u05d2\u05e8\u05d9\u05d4": { names: ["Hungary"], flag: "\u{1F1ED}\u{1F1FA}" },
  "\u05e1\u05dc\u05d5\u05d1\u05e0\u05d9\u05d4": { names: ["Slovenia"], flag: "\u{1F1F8}\u{1F1EE}" },
  "\u05e1\u05dc\u05d5\u05d1\u05d0\u05e7\u05d9\u05d4": { names: ["Slovakia"], flag: "\u{1F1F8}\u{1F1F0}" },
  "\u05d0\u05dc \u05e1\u05dc\u05d5\u05d5\u05d3\u05d9\u05d4": { names: ["Slovenia"], flag: "\u{1F1F8}\u{1F1EE}" },
  "\u05e7\u05d0\u05de\u05e8\u05d5\u05df": { names: ["Cameroon"], flag: "\u{1F1E8}\u{1F1F2}" },
  "\u05d2\u05d0\u05e0\u05d4": { names: ["Ghana"], flag: "\u{1F1EC}\u{1F1ED}" },
  "\u05e0\u05d9\u05d2\u05e8\u05d9\u05d4": { names: ["Nigeria"], flag: "\u{1F1F3}\u{1F1EC}" },
  "\u05d0\u05ea\u05d9\u05d5\u05e4\u05d9\u05d4": { names: ["Ethiopia"], flag: "\u{1F1EA}\u{1F1F9}" },
  "\u05e7\u05d8\u05d0\u05e8": { names: ["Qatar"], flag: "\u{1F1F6}\u{1F1E6}" },
  "\u05d0\u05d5\u05d0\u05d6\u05d1\u05e7\u05d9\u05e1\u05d8\u05df": { names: ["Uzbekistan"], flag: "\u{1F1FA}\u{1F1FF}" },
  "\u05e4\u05e0\u05de\u05d4": { names: ["Panama"], flag: "\u{1F1F5}\u{1F1E6}" },
  "\u05d4\u05d5\u05d3\u05d5": { names: ["India"], flag: "\u{1F1EE}\u{1F1F3}" },
  "\u05e6\u05d9\u05d9\u05df": { names: ["China", "China PR"], flag: "\u{1F1E8}\u{1F1F3}" },
  "\u05d0\u05d9\u05e1\u05dc\u05e0\u05d3": { names: ["Iceland"], flag: "\u{1F1EE}\u{1F1F8}" },
  "\u05e4\u05d9\u05e0\u05dc\u05e0\u05d3": { names: ["Finland"], flag: "\u{1F1EB}\u{1F1EE}" },
  "\u05d0\u05dc\u05d1\u05d9\u05d4": { names: ["Albania"], flag: "\u{1F1E6}\u{1F1F1}" },
  "\u05d1\u05d5\u05e1\u05e0\u05d9\u05d4 \u05d5\u05d4\u05e8\u05e6\u05d2\u05d5\u05d1\u05d9\u05e0\u05d4": { names: ["Bosnia and Herzegovina", "Bosnia"], flag: "\u{1F1E7}\u{1F1E6}" },
  "\u05de\u05e7\u05d3\u05d5\u05e0\u05d9\u05d4": { names: ["North Macedonia", "Macedonia"], flag: "\u{1F1F2}\u{1F1F0}" },
  "\u05d1\u05dc\u05d2\u05e8\u05d9\u05d4": { names: ["Bulgaria"], flag: "\u{1F1E7}\u{1F1EC}" },
};

function normalizeHe(s: string): string {
  return s.trim().replace(/\u05f3/g, "'").replace(/\u05f4/g, '"');
}

function lookupAliases(nameHe: string): AliasInfo {
  const n = normalizeHe(nameHe);
  if (HEBREW_ALIASES[n]) return HEBREW_ALIASES[n];
  for (const [key, val] of Object.entries(HEBREW_ALIASES)) {
    if (n.includes(key) || key.includes(n)) return val;
  }
  return { names: [nameHe] };
}

/** Build nation registry from GetTeamsAndPlayers grouped response. */
export function buildNationRegistry(marketRaw: any[]): {
  byId: Record<number, NationEntry>;
  list: NationEntry[];
} {
  const byId: Record<number, NationEntry> = {};
  const list: NationEntry[] = [];
  for (const group of marketRaw || []) {
    const id = group.id ?? group.teamId;
    const nameHe = (group.name || group.teamName || "").trim();
    if (id == null || !nameHe) continue;
    const alias = lookupAliases(nameHe);
    const entry: NationEntry = {
      nationTeamId: Number(id),
      nameHe,
      sportsDbNames: alias.names,
      flagEmoji: alias.flag ?? null,
    };
    byId[entry.nationTeamId] = entry;
    list.push(entry);
  }
  return { byId, list };
}

function teamMatches(name: string | null, aliases: string[]): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return aliases.some((a) => lower.includes(a.toLowerCase()) || a.toLowerCase().includes(lower));
}

export function fixtureInvolvesNation(f: SlimFixture, nation: NationEntry): boolean {
  return (
    teamMatches(f.homeTeam, nation.sportsDbNames) ||
    teamMatches(f.awayTeam, nation.sportsDbNames)
  );
}

/** Find the nation's fixture within a set of round fixtures. */
export function matchNationToFixture(
  nationTeamId: number,
  roundFixtures: SlimFixture[],
  registry: Record<number, NationEntry>
): SlimFixture | null {
  const nation = registry[nationTeamId];
  if (!nation) return null;
  return roundFixtures.find((f) => fixtureInvolvesNation(f, nation)) ?? null;
}

export function opponentForNation(f: SlimFixture, nation: NationEntry): string | null {
  if (teamMatches(f.homeTeam, nation.sportsDbNames)) return f.awayTeam;
  if (teamMatches(f.awayTeam, nation.sportsDbNames)) return f.homeTeam;
  return null;
}
