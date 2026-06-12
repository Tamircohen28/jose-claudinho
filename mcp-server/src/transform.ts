/** Helpers to turn raw Sport5 API payloads into compact, agent-friendly DTOs. */

import { POSITION_LABEL, BONUS_CHIPS } from "./rules.js";

const BONUS_LABEL: Record<number, string> = Object.fromEntries(
  BONUS_CHIPS.map((c) => [c.bonusId, c.label])
);

export function priceToM(price: number): number {
  return Math.round((price / 1e6) * 10) / 10;
}

export function positionLabel(p: number): string {
  return POSITION_LABEL[p] || String(p);
}

/** Parse the stringified `statsData` blob into a compact non-zero breakdown. */
export function parseStatsData(
  statsStr: string | null | undefined
): Record<string, { count: number; points: number }> | null {
  if (!statsStr) return null;
  try {
    const obj = JSON.parse(statsStr);
    const out: Record<string, { count: number; points: number }> = {};
    for (const [key, val] of Object.entries(obj as Record<string, any>)) {
      if (val && (val.Count || val.Points)) {
        out[key] = { count: val.Count, points: val.Points };
      }
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

export interface SlimPlayer {
  id: number;
  name: string;
  position: string;
  nationTeamId: number;
  priceM: number;
  injured: boolean;
  expelled: boolean;
  missing: boolean;
  available: boolean;
  seasonPoints: number | null;
  lastRoundPoints: number | null;
  pointsPerMillion: number | null;
}

/** Slim a raw `player` object (from market or a squad entry). */
export function slimPlayer(p: any): SlimPlayer {
  const lr = p.lastRoundPlayerStats;
  const ls = p.lastSeasonPlayerStats;
  const seasonPoints =
    ls && typeof ls.points === "number"
      ? ls.points
      : lr && typeof lr.seasonPoints === "number"
        ? lr.seasonPoints
        : null;
  const lastRoundPoints = lr && typeof lr.points === "number" ? lr.points : null;
  const injured = !!p.injuredStatus;
  const expelled = !!p.expelledStatus;
  const missing = !!p.missingStatus;
  return {
    id: p.id,
    name: (p.name || "").trim(),
    position: positionLabel(p.position),
    nationTeamId: p.teamId,
    priceM: priceToM(p.price),
    injured,
    expelled,
    missing,
    available: !injured && !expelled && !missing,
    seasonPoints,
    lastRoundPoints,
    pointsPerMillion:
      seasonPoints != null && p.price
        ? Math.round((seasonPoints / (p.price / 1e6)) * 100) / 100
        : null,
  };
}

/** Flatten the GetTeamsAndPlayers grouped response into a flat player list. */
export function flattenMarket(data: any[]): any[] {
  const players: any[] = [];
  for (const group of data || []) {
    for (const pl of group.players || []) players.push(pl);
  }
  return players;
}

/** Shape a full userTeam payload into a structured squad summary. */
export function summarizeTeam(data: any) {
  const team = data.userTeam;
  const entries = (team.userTeamPlayers || []).filter(
    (e: any) => !e.isRemoved
  );
  const players = entries.map((e: any) => {
    const slim = slimPlayer(e.player);
    return {
      ...slim,
      boughtPriceM: priceToM(e.boughtPrice),
      isReserve: !!e.isReserve,
      isCaptain: e.playerId === team.captainId,
      isViceCaptain: e.playerId === team.subCaptainId,
      lastRoundBreakdown: parseStatsData(
        e.player.lastRoundPlayerStats?.statsData
      ),
    };
  });

  const starters = players.filter((p: any) => !p.isReserve);
  const bench = players.filter((p: any) => p.isReserve);
  const byPos = (list: any[]) => {
    const c: Record<string, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    for (const p of list) c[p.position] = (c[p.position] || 0) + 1;
    return c;
  };
  const startersByPos = byPos(starters);
  const formation = `${startersByPos.DEF}-${startersByPos.MID}-${startersByPos.FWD}`;

  // Count players per national team (for the per-team cap check).
  const perTeam: Record<number, number> = {};
  for (const p of players) perTeam[p.nationTeamId] = (perTeam[p.nationTeamId] || 0) + 1;

  return {
    teamName: team.name,
    managerName: team.creatorName,
    userId: team.userId,
    userTeamId: team.id,
    roundId: team.roundId,
    leagueId: team.leagueId,
    usedBudgetM: priceToM(team.usedBudget),
    points: team.points,
    favTeam: team.favTeam
      ? { id: team.favTeam.id, name: team.favTeam.name }
      : null,
    captainId: team.captainId,
    viceCaptainId: team.subCaptainId,
    bonusesUsed: (team.bonusesData || []).map((b: any) => ({
      bonusId: b.bonusId,
      chip: BONUS_LABEL[b.bonusId] || `bonus#${b.bonusId}`,
      usageRoundId: b.usageRoundId,
    })),
    formation,
    startersByPosition: startersByPos,
    benchByPosition: byPos(bench),
    playersPerNationalTeam: perTeam,
    starters,
    bench,
    user: data.user
      ? { id: data.user.id, fullName: data.user.fullName, email: data.user.email }
      : null,
  };
}
