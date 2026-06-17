/**
 * Fetches player injury/availability data from API-Football (api-football.com).
 *
 * Free tier: 100 requests/day. Results are cached locally with a 6-hour TTL
 * so a single daily run covers an entire match week without exhausting the quota.
 *
 * Set API_FOOTBALL_KEY in the MCP server environment to enable external data.
 * Without it the tool still works — it returns only Sport5's own status flags.
 */

import { envOpt } from "./env.js";
import { readCacheFile, writeCacheFile } from "./storage.js";
import type { ExternalPlayerAvailability } from "./playerMapping.js";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
// FIFA World Cup 2026 in API-Football (league 1 = FIFA World Cup)
const WC_LEAGUE_ID = 1;
const WC_SEASON = 2026;

interface InjuryCacheData {
  cachedAt: string;
  injuries: ExternalPlayerAvailability[];
  apiKeyPresent: boolean;
}

const CACHE_FILE = "injury-cache.json";
const CACHE_TTL_HOURS = 6;

async function apifootballGet(endpointPath: string, apiKey: string): Promise<any> {
  const url = `${API_FOOTBALL_BASE}${endpointPath}`;
  const resp = await fetch(url, {
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "v3.football.api-sports.io",
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`API-Football ${resp.status}: ${body}`);
  }
  return resp.json() as Promise<any>;
}

function parseStatus(type: string, reason: string): ExternalPlayerAvailability["status"] {
  const t = type.toLowerCase();
  const r = reason.toLowerCase();
  if (t.includes("suspend") || r.includes("suspend") || r.includes("red card")) return "suspended";
  if (t.includes("doubt") || r.includes("doubt") || r.includes("knock") || r.includes("minor")) {
    return "doubtful";
  }
  return "injured";
}

export async function fetchAndCacheInjuries(forceRefresh = false): Promise<{
  injuries: ExternalPlayerAvailability[];
  cachedAt: string;
  fromCache: boolean;
  apiKeyPresent: boolean;
}> {
  const apiKey = envOpt("API_FOOTBALL_KEY");

  if (!forceRefresh) {
    const cached = await readCacheFile<InjuryCacheData>(CACHE_FILE, CACHE_TTL_HOURS);
    if (cached) {
      return {
        injuries: cached.injuries,
        cachedAt: cached.cachedAt,
        fromCache: true,
        apiKeyPresent: cached.apiKeyPresent,
      };
    }
  }

  const injuries: ExternalPlayerAvailability[] = [];
  const apiKeyPresent = apiKey != null;

  if (apiKey) {
    try {
      const data = await apifootballGet(
        `/injuries?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`,
        apiKey
      );
      for (const item of (data.response ?? []) as any[]) {
        const player = item.player;
        const team = item.team;
        if (!player?.name || !team?.name) continue;
        injuries.push({
          playerNameEn: String(player.name),
          teamNameEn: String(team.name),
          status: parseStatus(String(item.type ?? ""), String(item.reason ?? "")),
          reason: item.reason ?? item.type ?? undefined,
        });
      }
      console.error(`[injuryClient] Fetched ${injuries.length} injuries from API-Football.`);
    } catch (err) {
      console.error("[injuryClient] API-Football fetch failed:", err);
    }
  } else {
    console.error("[injuryClient] No API_FOOTBALL_KEY — external injury data skipped.");
  }

  const cachedAt = new Date().toISOString();
  try {
    await writeCacheFile<InjuryCacheData>(CACHE_FILE, { cachedAt, injuries, apiKeyPresent });
  } catch {
    // Non-fatal cache write failure
  }

  return { injuries, cachedAt, fromCache: false, apiKeyPresent };
}
