/**
 * Maps between external API player/team data (English names) and Sport5 player IDs.
 *
 * Sport5 stores Hebrew player names; external sources use English.
 * Strategy: match on national team first, then last-name transliteration
 * with Levenshtein tolerance. Manual overrides in player-name-overrides.json
 * take priority for any edge-case mapping.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import type { SlimPlayer } from "./transform.js";
import type { NationEntry } from "./nations.js";
import { dataDir } from "./storage.js";
import type { PlayerRateOverrides } from "./scoring.js";

// ── Public types ──────────────────────────────────────────────────────────────

export interface ExternalPlayerAvailability {
  playerNameEn: string;
  teamNameEn: string;
  status: "injured" | "suspended" | "doubtful" | "fit";
  reason?: string;
}

export interface ExternalLineupTeam {
  teamNameEn: string;
  predictedStarters: string[]; // English player names
  source: string;
}

export interface AvailabilityEntry {
  playerId: number;
  playerNameHe: string;
  status: "injured" | "suspended" | "doubtful" | "fit";
  reason?: string;
  source: "sport5" | "external";
}

export interface LineupEntry {
  nationTeamId: number;
  teamNameEn: string;
  predictedStarterIds: number[];
  unmatchedNames: string[];
  confidence: number; // fraction of sources that agreed (0–1)
}

// ── Manual overrides ──────────────────────────────────────────────────────────

type OverrideMap = Record<string, number>; // "TeamName / PlayerName" → sport5PlayerId

async function loadOverrides(): Promise<OverrideMap> {
  const file = path.join(dataDir(), "player-name-overrides.json");
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as OverrideMap;
  } catch {
    return {};
  }
}

// ── Levenshtein distance ──────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ── Hebrew → Latin transliteration (for last-name matching) ──────────────────

const HE_TO_LATIN: Record<string, string> = {
  א: "", ב: "b", ג: "g", ד: "d", ה: "h", ו: "v", ז: "z", ח: "kh",
  ט: "t", י: "y", כ: "k", ך: "k", ל: "l", מ: "m", ם: "m", נ: "n",
  ן: "n", ס: "s", ע: "", פ: "p", ף: "f", צ: "ts", ץ: "ts", ק: "k",
  ר: "r", ש: "sh", ת: "t",
  "׳": "", // geresh
  "״": "", // gershayim
};

function transliterateHe(s: string): string {
  return s
    .split("")
    .map((c) => HE_TO_LATIN[c] ?? "")
    .join("")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function lastToken(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1] ?? name).toLowerCase().replace(/[^a-z]/g, "");
}

// ── Team name lookup ──────────────────────────────────────────────────────────

/** Build reverse map: English team name (lowercased) → nationTeamId. */
export function buildEnglishTeamNameToNationId(
  nationRegistry: Record<number, NationEntry>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of Object.values(nationRegistry)) {
    for (const enName of entry.sportsDbNames) {
      map.set(enName.toLowerCase(), entry.nationTeamId);
    }
  }
  return map;
}

// ── Player name resolution ────────────────────────────────────────────────────

/**
 * Find the Sport5 player ID for an English name within a national team's roster.
 * Returns null when no match is within the Levenshtein tolerance.
 */
export function resolveToSport5Id(
  nameEn: string,
  teamPlayers: SlimPlayer[],
  overrideKey: string,
  overrides: OverrideMap
): number | null {
  const override = overrides[overrideKey];
  if (override != null) return override;

  const targetLast = lastToken(nameEn);
  if (!targetLast) return null;

  let bestId: number | null = null;
  let bestDist = Infinity;

  for (const p of teamPlayers) {
    const heTranslit = transliterateHe(p.name);
    // Compare against full transliteration and a suffix window matching the target length
    const suffixLen = Math.min(heTranslit.length, targetLast.length + 3);
    const heSuffix = heTranslit.slice(heTranslit.length - suffixLen);
    const dist = Math.min(
      levenshtein(targetLast, heTranslit),
      levenshtein(targetLast, heSuffix)
    );
    if (dist < bestDist) {
      bestDist = dist;
      bestId = p.id;
    }
  }

  // Accept match only within tolerance (scales slightly with name length)
  const tolerance = Math.max(2, Math.floor(targetLast.length * 0.35));
  return bestDist <= tolerance ? bestId : null;
}

// ── Availability map builder ──────────────────────────────────────────────────

/**
 * Merge Sport5 own flags + external injury data into a per-player availability map.
 * Sport5 flags always win: if Sport5 says injured/suspended, that overrides external.
 */
export async function buildAvailabilityMap(
  externalInjuries: ExternalPlayerAvailability[],
  allPlayers: SlimPlayer[],
  nationRegistry: Record<number, NationEntry>
): Promise<Map<number, AvailabilityEntry>> {
  const overrides = await loadOverrides();
  const teamNameToId = buildEnglishTeamNameToNationId(nationRegistry);
  const map = new Map<number, AvailabilityEntry>();

  // Seed with Sport5's own flags (authoritative)
  for (const p of allPlayers) {
    // Sport5's raw feed can include malformed entries with a null id / empty name;
    // they must never enter the availability map (caused ~640 phantom rows).
    if (p.id == null || !p.name) continue;
    if (!p.available) {
      const status: AvailabilityEntry["status"] = p.expelled ? "suspended" : "injured";
      map.set(p.id, { playerId: p.id, playerNameHe: p.name, status, source: "sport5" });
    }
  }

  // Group players by nationTeamId for fast lookup
  const playersByTeam = new Map<number, SlimPlayer[]>();
  for (const p of allPlayers) {
    if (!playersByTeam.has(p.nationTeamId)) playersByTeam.set(p.nationTeamId, []);
    playersByTeam.get(p.nationTeamId)!.push(p);
  }

  // Apply external injuries (don't override Sport5 flags)
  for (const ext of externalInjuries) {
    const nationId = teamNameToId.get(ext.teamNameEn.toLowerCase());
    if (nationId == null) continue;
    const teamPlayers = playersByTeam.get(nationId) ?? [];
    const overrideKey = `${ext.teamNameEn} / ${ext.playerNameEn}`;
    const sport5Id = resolveToSport5Id(ext.playerNameEn, teamPlayers, overrideKey, overrides);
    if (sport5Id == null) continue;

    if (map.get(sport5Id)?.source === "sport5") continue; // Sport5 flag wins

    map.set(sport5Id, {
      playerId: sport5Id,
      playerNameHe: teamPlayers.find((p) => p.id === sport5Id)?.name ?? ext.playerNameEn,
      status: ext.status,
      reason: ext.reason,
      source: "external",
    });
  }

  return map;
}

// ── Lineup map builder ────────────────────────────────────────────────────────

/** Map consensus predicted starters (English names) to Sport5 player IDs. */
export async function buildLineupMap(
  consensus: { teamNameEn: string; consensusStarters: string[]; confidence: number }[],
  allPlayers: SlimPlayer[],
  nationRegistry: Record<number, NationEntry>
): Promise<LineupEntry[]> {
  const overrides = await loadOverrides();
  const teamNameToId = buildEnglishTeamNameToNationId(nationRegistry);

  const playersByTeam = new Map<number, SlimPlayer[]>();
  for (const p of allPlayers) {
    if (!playersByTeam.has(p.nationTeamId)) playersByTeam.set(p.nationTeamId, []);
    playersByTeam.get(p.nationTeamId)!.push(p);
  }

  const entries: LineupEntry[] = [];
  for (const teamLineup of consensus) {
    const nationId = teamNameToId.get(teamLineup.teamNameEn.toLowerCase());
    if (nationId == null) continue;
    const teamPlayers = playersByTeam.get(nationId) ?? [];
    const predictedStarterIds: number[] = [];
    const unmatchedNames: string[] = [];

    for (const playerNameEn of teamLineup.consensusStarters) {
      const overrideKey = `${teamLineup.teamNameEn} / ${playerNameEn}`;
      const sport5Id = resolveToSport5Id(playerNameEn, teamPlayers, overrideKey, overrides);
      if (sport5Id != null) {
        predictedStarterIds.push(sport5Id);
      } else {
        unmatchedNames.push(playerNameEn);
      }
    }

    entries.push({
      nationTeamId: nationId,
      teamNameEn: teamLineup.teamNameEn,
      predictedStarterIds,
      unmatchedNames,
      confidence: teamLineup.confidence,
    });
  }
  return entries;
}

/**
 * Derive per-player EV rate overrides from lineup confidence and season data.
 *
 * lineupConfidence: 0–1 from LineupEntry.confidence (0 = unknown/bench, 1 = nailed-on starter)
 * isInPredictedStarterIds: true if the player appears in predictedStarterIds for their team
 * seasonGoalShare: optional fraction of team's total goals scored by this player (0–1)
 */
export function derivePlayerRates(
  lineupConfidence: number,
  isInPredictedStarterIds: boolean,
  seasonGoalShare?: number,
  position?: number
): PlayerRateOverrides {
  const conf = Math.max(0, Math.min(1, lineupConfidence));

  // pPlays: scales from 0.55 (unknown) to 0.95 (nailed-on confirmed starter)
  // Non-predicted starters get a 0.35 floor (they might come off the bench)
  const pPlays = isInPredictedStarterIds
    ? 0.55 + 0.40 * conf
    : Math.max(0.35, 0.45 * conf);

  // pPlays60: scales from 0.65 (unknown) to 0.92 (nailed-on)
  const pPlays60 = isInPredictedStarterIds
    ? 0.65 + 0.27 * conf
    : Math.max(0.50, 0.60 * conf);

  const overrides: PlayerRateOverrides = { pPlays, pPlays60 };

  // If we have a player-specific season goal share, use it to adjust the goal share
  // relative to the position-level baseline. Only apply when the position is known.
  if (seasonGoalShare != null && seasonGoalShare > 0 && position != null) {
    // Position baselines from scoring.ts GOAL_SHARE
    const POSITION_BASELINE: Record<number, number> = {
      1: 0.004, 2: 0.047, 3: 0.140, 4: 0.340,
    };
    const baseline = POSITION_BASELINE[position] ?? 0.140;
    // Blend 50/50 between player-specific and position baseline (shrinkage toward mean)
    overrides.goalShare = 0.5 * seasonGoalShare + 0.5 * baseline;
  }

  return overrides;
}
