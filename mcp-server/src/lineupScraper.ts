/**
 * Fetches predicted starting lineups from three public sources and builds a consensus.
 *
 * Sources:
 *   1. FotMob     — unofficial JSON matches API
 *   2. RotoWire   — HTML-parsed WOC lineups page
 *   3. 365scores  — unofficial JSON games API
 *
 * Consensus rule: a player is a "predicted starter" when they appear in ≥ 2 of 3
 * sources. With only one source available, that source's XI is used at low confidence.
 * Results are cached with a 2-hour TTL.
 */

import { readCacheFile, writeCacheFile } from "./storage.js";
import type { ExternalLineupTeam } from "./playerMapping.js";

export type { ExternalLineupTeam };

const CACHE_FILE = "lineup-cache.json";
const CACHE_TTL_HOURS = 2;

export interface ConsensusLineup {
  teamNameEn: string;
  consensusStarters: string[];
  confidence: number;   // 0–1: fraction of sources that agreed on the starter
  sourcesCount: number; // number of sources that had data for this team
}

interface LineupCacheData {
  cachedAt: string;
  lineups: ConsensusLineup[];
  matchDates: string[];
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

// ── FotMob ────────────────────────────────────────────────────────────────────

async function fetchFotMobLineups(yyyymmddDates: string[]): Promise<ExternalLineupTeam[]> {
  const results: ExternalLineupTeam[] = [];
  for (const date of yyyymmddDates) {
    try {
      const url = `https://www.fotmob.com/api/matches?date=${date}`;
      const resp = await fetch(url, {
        headers: { ...BROWSER_HEADERS, "Accept": "application/json", "Referer": "https://www.fotmob.com/" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!resp.ok) continue;
      const data = await resp.json() as any;

      for (const league of (data.leagues ?? []) as any[]) {
        const leagueName: string = String(league.name ?? "").toLowerCase();
        if (!leagueName.includes("world cup")) continue;

        for (const match of (league.matches ?? []) as any[]) {
          for (const side of [match.home, match.away] as any[]) {
            if (!side) continue;
            const teamName: string = String(side.name ?? side.longName ?? "").trim();
            if (!teamName) continue;

            // FotMob exposes lineups under various paths depending on match state
            const playerLists = [
              side.lineup?.players,
              side.players,
              match.lineups?.[String(side.id)]?.players,
            ].filter(Array.isArray);

            for (const players of playerLists) {
              const starters = (players as any[])
                .filter((p) => p.positionId !== "Sub" && p.positionId !== "Bench" && !p.isSub)
                .map((p) => String(p.name ?? p.playerName ?? p.shortName ?? "").trim())
                .filter(Boolean);
              if (starters.length >= 10) {
                results.push({ teamNameEn: teamName, predictedStarters: starters.slice(0, 11), source: "fotmob" });
                break;
              }
            }
          }
        }
      }
    } catch {
      // Skip this date silently
    }
  }
  return results;
}

// ── RotoWire ──────────────────────────────────────────────────────────────────

function parseRotoWireHtml(html: string): ExternalLineupTeam[] {
  const results: ExternalLineupTeam[] = [];
  const tagPattern = /<[^>]+>/g;

  // RotoWire renders each team block as a container with class "lineup__main" or "lineup__team".
  // We locate team-name and player-name spans via class patterns.
  const teamBlockPattern =
    /<div[^>]*class="[^"]*lineup\b[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*lineup\b|$)/gi;
  const teamNamePattern = /class="[^"]*lineup__team-name[^"]*"[^>]*>([\s\S]*?)<\/\w+>/i;
  const playerNamePattern = /class="[^"]*lineup__player-name[^"]*"[^>]*>([\s\S]*?)<\/\w+>/gi;

  let block: RegExpExecArray | null;
  while ((block = teamBlockPattern.exec(html)) !== null) {
    const content = block[1] ?? "";
    const nameMatch = teamNamePattern.exec(content);
    if (!nameMatch) continue;
    const teamName = (nameMatch[1] ?? "").replace(tagPattern, "").trim();
    if (!teamName) continue;

    const starters: string[] = [];
    let pm: RegExpExecArray | null;
    const localPlayerPattern = new RegExp(playerNamePattern.source, "gi");
    while ((pm = localPlayerPattern.exec(content)) !== null) {
      const name = (pm[1] ?? "").replace(tagPattern, "").trim();
      if (name && starters.length < 11) starters.push(name);
    }
    if (starters.length >= 10) {
      results.push({ teamNameEn: teamName, predictedStarters: starters, source: "rotowire" });
    }
  }
  return results;
}

async function fetchRotoWireLineups(): Promise<ExternalLineupTeam[]> {
  try {
    const url = "https://www.rotowire.com/soccer/lineups.php?league=WOC";
    const resp = await fetch(url, {
      headers: { ...BROWSER_HEADERS, "Accept": "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    return parseRotoWireHtml(html);
  } catch {
    return [];
  }
}

// ── 365scores ─────────────────────────────────────────────────────────────────

async function fetch365ScoresLineups(yyyymmddDates: string[]): Promise<ExternalLineupTeam[]> {
  const results: ExternalLineupTeam[] = [];
  for (const date of yyyymmddDates) {
    try {
      // date is YYYYMMDD → convert to DD/MM/YYYY for 365scores
      const y = date.slice(0, 4);
      const m = date.slice(4, 6);
      const d = date.slice(6, 8);
      const dateFmt = `${d}/${m}/${y}`;
      // competition 44 = FIFA World Cup in 365scores
      const url =
        `https://webws.365scores.com/web/games/?appTypeId=5&langId=1` +
        `&startDate=${dateFmt}&endDate=${dateFmt}&competitions=44&withLineups=true`;
      const resp = await fetch(url, {
        headers: {
          ...BROWSER_HEADERS,
          "Accept": "application/json",
          "Referer": "https://www.365scores.com/soccer/world-cup/",
          "Origin": "https://www.365scores.com",
        },
        signal: AbortSignal.timeout(12_000),
      });
      if (!resp.ok) continue;
      const data = await resp.json() as any;

      for (const game of (data.games ?? []) as any[]) {
        for (const side of [game.homeCompetitor, game.awayCompetitor] as any[]) {
          if (!side?.name) continue;
          const teamName: string = String(side.name).trim();
          // 365scores lineup athletes path
          const athletes: any[] =
            side.lineups?.athletes ??
            side.formations?.[0]?.athletes ??
            [];
          const starters = athletes
            .filter((a) => !a.isSub && (a.status?.id === 1 || a.lineupStatus?.id === 1 || a.status?.id == null))
            .map((a) => String(a.name ?? a.shortName ?? a.athlete?.name ?? "").trim())
            .filter(Boolean);
          if (starters.length >= 10) {
            results.push({ teamNameEn: teamName, predictedStarters: starters.slice(0, 11), source: "365scores" });
          }
        }
      }
    } catch {
      // Skip this date
    }
  }
  return results;
}

// ── Consensus ─────────────────────────────────────────────────────────────────

function normalizePlayerName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

export function buildConsensusLineups(
  allSources: ExternalLineupTeam[],
  minSources = 2
): ConsensusLineup[] {
  // Group entries by team name
  const byTeam = new Map<string, Map<string, ExternalLineupTeam[]>>();
  for (const entry of allSources) {
    const teamKey = entry.teamNameEn.toLowerCase().trim();
    if (!byTeam.has(teamKey)) byTeam.set(teamKey, new Map());
    const sourceMap = byTeam.get(teamKey)!;
    if (!sourceMap.has(entry.source)) sourceMap.set(entry.source, []);
    sourceMap.get(entry.source)!.push(entry);
  }

  const consensus: ConsensusLineup[] = [];
  for (const [teamKey, sourceMap] of byTeam) {
    const sourcesCount = sourceMap.size;
    const allEntries = [...sourceMap.values()].flat();
    const teamNameEn = allEntries[0]?.teamNameEn ?? teamKey;

    // Count how many sources include each normalized player name
    const playerCounts = new Map<string, { rawName: string; count: number }>();
    for (const entry of allEntries) {
      for (const name of entry.predictedStarters) {
        const norm = normalizePlayerName(name);
        if (!norm) continue;
        const existing = playerCounts.get(norm);
        if (existing) {
          existing.count++;
        } else {
          playerCounts.set(norm, { rawName: name, count: 1 });
        }
      }
    }

    // Use minSources threshold, but fall back to 1 if only 1 source has this team
    const effectiveMin = Math.min(minSources, sourcesCount);
    const starters = [...playerCounts.values()]
      .filter((p) => p.count >= effectiveMin)
      .sort((a, b) => b.count - a.count)
      .slice(0, 11)
      .map((p) => p.rawName);

    const matchingEntries = [...playerCounts.values()].filter((p) => p.count >= effectiveMin);
    const avgConfidence =
      matchingEntries.length > 0
        ? matchingEntries.reduce((s, p) => s + p.count / sourcesCount, 0) / matchingEntries.length
        : 0;

    consensus.push({
      teamNameEn,
      consensusStarters: starters,
      confidence: Math.min(1, avgConfidence),
      sourcesCount,
    });
  }

  return consensus;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetch predicted lineups from all 3 sources, build consensus, cache the result.
 * @param matchDates YYYY-MM-DD strings for the dates to query
 */
export async function fetchAndCacheLineupPredictions(
  matchDates: string[],
  forceRefresh = false
): Promise<{ lineups: ConsensusLineup[]; cachedAt: string; fromCache: boolean }> {
  if (!forceRefresh) {
    const cached = await readCacheFile<LineupCacheData>(CACHE_FILE, CACHE_TTL_HOURS);
    if (cached) return { lineups: cached.lineups, cachedAt: cached.cachedAt, fromCache: true };
  }

  // YYYYMMDD format for FotMob and 365scores
  const compactDates = matchDates.map((d) => d.replace(/-/g, ""));

  const [fotmobResult, rotoWireResult, scoresResult] = await Promise.allSettled([
    fetchFotMobLineups(compactDates),
    fetchRotoWireLineups(),
    fetch365ScoresLineups(compactDates),
  ]);

  const fotmobData = fotmobResult.status === "fulfilled" ? fotmobResult.value : [];
  const rotoWireData = rotoWireResult.status === "fulfilled" ? rotoWireResult.value : [];
  const scoresData = scoresResult.status === "fulfilled" ? scoresResult.value : [];

  console.error(
    `[lineupScraper] fotmob=${fotmobData.length} teams, ` +
    `rotowire=${rotoWireData.length} teams, ` +
    `365scores=${scoresData.length} teams`
  );

  const allLineups: ExternalLineupTeam[] = [...fotmobData, ...rotoWireData, ...scoresData];
  const lineups = buildConsensusLineups(allLineups);
  const cachedAt = new Date().toISOString();

  try {
    await writeCacheFile<LineupCacheData>(CACHE_FILE, { cachedAt, lineups, matchDates });
  } catch {
    // Non-fatal
  }

  return { lineups, cachedAt, fromCache: false };
}
