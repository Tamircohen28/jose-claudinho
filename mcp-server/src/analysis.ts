/** Snapshot building and ownership analysis over stored top-team data. */

import { s5get, pool } from "./sport5Client.js";
import { flattenMarket, slimPlayer, priceToM } from "./transform.js";

/** Capture the current top-N league table, their squads, and the market. */
export async function buildSnapshot(opts: {
  topN: number;
  leagueId: string | number | null;
  isPerRound: boolean;
  concurrency?: number;
}): Promise<any> {
  const table = await s5get("/CustomLeagues/GetLeagueData", {
    leagueId: opts.leagueId,
    teamId: null,
    isPerRound: opts.isPerRound,
    pageIndex: 0,
    searchText: "",
  });

  const topTeams = (table.teams || []).slice(0, opts.topN);

  // Slim market keyed by player id, so analysis has price/points context.
  const marketRaw = await s5get("/Players/GetTeamsAndPlayers");
  const marketList = flattenMarket(marketRaw).map(slimPlayer);
  const marketById: Record<number, any> = {};
  for (const p of marketList) marketById[p.id] = p;

  // Fetch each top team's squad with bounded concurrency.
  const squads = await pool(topTeams, opts.concurrency ?? 5, async (t: any) => {
    try {
      const data = await s5get("/UserTeam/GetUserAndTeam", { userId: t.userId });
      const team = data.userTeam;
      const players = (team.userTeamPlayers || [])
        .filter((e: any) => !e.isRemoved)
        .map((e: any) => ({
          playerId: e.playerId,
          isReserve: !!e.isReserve,
        }));
      return {
        userId: t.userId,
        teamName: t.name,
        userName: t.userName,
        totalScore: t.totalScore,
        roundScore: t.roundScore,
        position: t.position,
        captainId: team.captainId,
        viceCaptainId: team.subCaptainId,
        bonusesUsed: (team.bonusesData || []).map((b: any) => b.bonusId),
        usedBudgetM: priceToM(team.usedBudget),
        players,
      };
    } catch (e: any) {
      return { userId: t.userId, teamName: t.name, error: String(e?.message || e), players: [] };
    }
  });

  const captured = squads.filter((s: any) => !s.error);
  const roundId = table.roundId ?? null;

  return {
    capturedAt: new Date().toISOString(),
    leagueId: opts.leagueId,
    isPerRound: opts.isPerRound,
    topN: opts.topN,
    roundId,
    leagueName: table.leagueName ?? null,
    market: marketById,
    squads,
  };
}

/**
 * Compute ownership / captaincy / value metrics over a snapshot.
 * Returns ranked lists the advisor can act on.
 */
export function analyzeOwnership(
  snapshot: any,
  opts: { position?: string; topN?: number; minSeasonPoints?: number } = {}
) {
  const squads = (snapshot.squads || []).filter((s: any) => !s.error && s.players?.length);
  const market: Record<number, any> = snapshot.market || {};
  const n = squads.length;
  if (!n) return { error: "Snapshot has no usable squads." };

  const owned: Record<number, { starters: number; bench: number; total: number }> = {};
  const captained: Record<number, number> = {};
  const viced: Record<number, number> = {};

  for (const s of squads) {
    for (const p of s.players) {
      const o = (owned[p.playerId] ||= { starters: 0, bench: 0, total: 0 });
      o.total++;
      if (p.isReserve) o.bench++;
      else o.starters++;
    }
    if (s.captainId) captained[s.captainId] = (captained[s.captainId] || 0) + 1;
    if (s.viceCaptainId) viced[s.viceCaptainId] = (viced[s.viceCaptainId] || 0) + 1;
  }

  const pct = (c: number) => Math.round((c / n) * 1000) / 10;
  const posFilter = opts.position ? opts.position.toUpperCase() : null;
  const topN = opts.topN ?? 25;

  const rows = Object.entries(owned).map(([idStr, o]) => {
    const id = Number(idStr);
    const m = market[id] || {};
    return {
      id,
      name: m.name ?? `#${id}`,
      position: m.position ?? "?",
      nationTeamId: m.nationTeamId ?? null,
      priceM: m.priceM ?? null,
      seasonPoints: m.seasonPoints ?? null,
      pointsPerMillion: m.pointsPerMillion ?? null,
      ownedBy: o.total,
      ownershipPct: pct(o.total),
      startedPct: pct(o.starters),
      captainedBy: captained[id] || 0,
      captaincyPct: pct(captained[id] || 0),
    };
  });

  const filtered = posFilter ? rows.filter((r) => r.position === posFilter) : rows;
  if (opts.minSeasonPoints != null) {
    for (const r of filtered) if (r.seasonPoints == null) r.seasonPoints = 0;
  }

  const mostOwned = [...filtered].sort((a, b) => b.ownedBy - a.ownedBy).slice(0, topN);
  const topCaptains = [...filtered]
    .filter((r) => r.captainedBy > 0)
    .sort((a, b) => b.captainedBy - a.captainedBy)
    .slice(0, topN);
  const bestValue = [...filtered]
    .filter((r) => (r.pointsPerMillion ?? 0) > 0)
    .sort((a, b) => (b.pointsPerMillion ?? 0) - (a.pointsPerMillion ?? 0))
    .slice(0, topN);
  // Differentials: scoring well but rarely owned among top teams.
  const differentials = [...filtered]
    .filter((r) => (r.seasonPoints ?? 0) > 0 && r.ownershipPct <= 15)
    .sort((a, b) => (b.seasonPoints ?? 0) - (a.seasonPoints ?? 0))
    .slice(0, topN);

  return {
    capturedAt: snapshot.capturedAt,
    roundId: snapshot.roundId,
    squadsAnalyzed: n,
    positionFilter: posFilter,
    mostOwned,
    topCaptains,
    bestValue,
    differentials,
  };
}
