/** Round utilization: join squads, nations, and fixtures for league watch reports. */

import { s5get, pool, requireCookie, Sport5Error } from "./sport5Client.js";
import { summarizeTeam } from "./transform.js";
import { LEAGUE_UTILIZATION_MAX_TEAMS } from "./rules.js";
import {
  getAllFixtures,
  isFixturePlayed,
  fixturesForFantasyRound,
  formatIsraelTime,
  type SlimFixture,
} from "./fixtures.js";
import {
  buildNationRegistry,
  matchNationToFixture,
  opponentForNation,
  type NationEntry,
} from "./nations.js";

export interface PlayerRoundStatus {
  playerId: number;
  name: string;
  position: string;
  nationTeamId: number;
  nationNameHe: string;
  nationFlag: string | null;
  isStarter: boolean;
  fixture: {
    id: string;
    homeTeam: string | null;
    awayTeam: string | null;
    opponent: string | null;
    date: string | null;
    timeIsrael: string;
    dateIsrael: string;
    name: string;
  } | null;
  played: boolean;
  roundPoints: number | null;
}

export interface TeamUtilizationSummary {
  userId: number;
  teamName: string;
  userName: string;
  played: number;
  upcoming: number;
  total: number;
  empty?: boolean;
  error?: string;
  players?: PlayerRoundStatus[];
}

export interface LeagueContext {
  leagueId: number | null;
  leagueName: string | null;
  roundId: number;
}

async function loadMarketAndNations() {
  const marketRaw = await s5get("/Players/GetTeamsAndPlayers");
  return { marketRaw, ...buildNationRegistry(marketRaw) };
}

export async function resolveLeague(opts: {
  leagueId?: number | null;
  leagueName?: string | null;
}): Promise<{ leagueId: number | null; leagueName: string | null }> {
  if (opts.leagueId != null) {
    const data = await s5get("/CustomLeagues/GetLeagueData", {
      leagueId: opts.leagueId,
      teamId: null,
      isPerRound: true,
      pageIndex: 0,
      searchText: "",
    });
    return { leagueId: opts.leagueId, leagueName: data.leagueName ?? null };
  }
  if (opts.leagueName) {
    const q = opts.leagueName.toLowerCase();
    const leagues = await s5get("/CustomLeagues/GetLeaguesSummary");
    const match = (leagues || []).find((l: any) =>
      (l.leagueName || "").toLowerCase().includes(q)
    );
    if (!match) {
      throw new Sport5Error(`No league matching "${opts.leagueName}" in your leagues list.`);
    }
    return { leagueId: match.id, leagueName: match.leagueName };
  }
  return { leagueId: null, leagueName: "Overall league" };
}

export async function fetchLeagueTeams(
  leagueId: number | null,
  maxTeams = LEAGUE_UTILIZATION_MAX_TEAMS
): Promise<{ teams: any[]; roundId: number | null; leagueName: string | null }> {
  const teams: any[] = [];
  let roundId: number | null = null;
  let leagueName: string | null = null;
  let pageIndex = 0;
  while (teams.length < maxTeams) {
    const data = await s5get("/CustomLeagues/GetLeagueData", {
      leagueId,
      teamId: null,
      isPerRound: true,
      pageIndex,
      searchText: "",
    });
    leagueName = data.leagueName ?? leagueName;
    roundId = data.roundId ?? roundId;
    const page = data.teams || [];
    if (!page.length) break;
    teams.push(...page);
    if (page.length < 50) break;
    pageIndex++;
  }
  if (teams.length > maxTeams) {
    throw new Sport5Error(
      `League has more than ${maxTeams} teams. Pass a private league id/name (e.g. a small league).`
    );
  }
  return { teams, roundId, leagueName };
}

export function buildPlayerRoundStatus(
  player: any,
  roundFixtures: SlimFixture[],
  registry: Record<number, NationEntry>
): PlayerRoundStatus {
  const nation = registry[player.nationTeamId];
  const fixture = matchNationToFixture(player.nationTeamId, roundFixtures, registry);
  const played = fixture ? isFixturePlayed(fixture) : false;
  const il = fixture ? formatIsraelTime(fixture.date, fixture.time) : null;
  return {
    playerId: player.id,
    name: player.name,
    position: player.position,
    nationTeamId: player.nationTeamId,
    nationNameHe: nation?.nameHe ?? `#${player.nationTeamId}`,
    nationFlag: nation?.flagEmoji ?? null,
    isStarter: !player.isReserve,
    fixture: fixture
      ? {
          id: fixture.id,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          opponent: nation ? opponentForNation(fixture, nation) : null,
          date: fixture.date,
          timeIsrael: il?.timeHe ?? "?",
          dateIsrael: il?.dateHe ?? "?",
          name: fixture.name,
        }
      : null,
    played,
    roundPoints: played ? (player.lastRoundPoints ?? null) : null,
  };
}

function summarizePlayers(players: PlayerRoundStatus[]): {
  played: number;
  upcoming: number;
  total: number;
} {
  const total = players.length;
  const played = players.filter((p) => p.played).length;
  return { played, upcoming: total - played, total };
}

export async function getTeamRoundUtilization(opts: {
  userId?: number;
  leagueId?: number | null;
  teamName?: string | null;
  roundId?: number;
  stage?: string;
}): Promise<{
  roundId: number;
  stage: string;
  teamName: string;
  userId: number;
  players: PlayerRoundStatus[];
  summary: { played: number; upcoming: number; total: number };
}> {
  requireCookie("Team round utilization");
  const stage = opts.stage || "group";
  const { byId: registry } = await loadMarketAndNations();
  const allFixtures = await getAllFixtures();

  let userId = opts.userId;
  let teamName = opts.teamName;

  if (!userId && teamName && opts.leagueId != null) {
    const { teams } = await fetchLeagueTeams(opts.leagueId);
    const q = teamName.toLowerCase();
    const t = teams.find(
      (x: any) => (x.name || "").toLowerCase().includes(q) || (x.userName || "").toLowerCase().includes(q)
    );
    if (!t) throw new Sport5Error(`No team matching "${teamName}" in league.`);
    userId = t.userId;
    teamName = t.name;
  }

  let data: any;
  if (userId) {
    data = await s5get("/UserTeam/GetUserAndTeam", { userId });
  } else {
    data = await s5get("/Account/GetConnectedUserAndTeam");
  }
  const team = summarizeTeam(data);
  userId = team.userId;
  teamName = team.teamName;

  let roundId = opts.roundId ?? team.roundId;
  if (roundId == null) {
    const { roundId: lr } = await fetchLeagueTeams(opts.leagueId ?? team.leagueId ?? null);
    roundId = lr ?? 1;
  }

  const roundFixtures = fixturesForFantasyRound(roundId, stage, allFixtures);
  const allPlayers = [...team.starters, ...team.bench];
  const players = allPlayers.map((p) => buildPlayerRoundStatus(p, roundFixtures, registry));

  return {
    roundId,
    stage,
    teamName: team.teamName,
    userId: team.userId,
    players,
    summary: summarizePlayers(players),
  };
}

export async function getLeagueRoundUtilization(opts: {
  leagueId?: number | null;
  leagueName?: string | null;
  roundId?: number;
  stage?: string;
}): Promise<{
  leagueName: string | null;
  leagueId: number | null;
  roundId: number;
  stage: string;
  teams: TeamUtilizationSummary[];
}> {
  requireCookie("League round utilization");
  const stage = opts.stage || "group";
  const resolved = await resolveLeague(opts);
  const { teams: tableTeams, roundId: leagueRoundId, leagueName } = await fetchLeagueTeams(resolved.leagueId);
  const roundId = opts.roundId ?? leagueRoundId ?? 1;
  const { byId: registry } = await loadMarketAndNations();
  const allFixtures = await getAllFixtures();
  const roundFixtures = fixturesForFantasyRound(roundId, stage, allFixtures);

  const squads = await pool(tableTeams, 5, async (t: any) => {
    try {
      const data = await s5get("/UserTeam/GetUserAndTeam", { userId: t.userId });
      const team = summarizeTeam(data);
      const allPlayers = [...team.starters, ...team.bench];
      const players = allPlayers.map((p) => buildPlayerRoundStatus(p, roundFixtures, registry));
      const summary = summarizePlayers(players);
      return {
        userId: t.userId,
        teamName: t.name,
        userName: t.userName,
        ...summary,
        empty: allPlayers.length === 0,
      };
    } catch (e: any) {
      return {
        userId: t.userId,
        teamName: t.name,
        userName: t.userName,
        played: 0,
        upcoming: 0,
        total: 0,
        empty: true,
        error: String(e?.message || e),
      };
    }
  });

  squads.sort((a, b) => b.played - a.played || a.teamName.localeCompare(b.teamName));

  return {
    leagueName: leagueName ?? resolved.leagueName,
    leagueId: resolved.leagueId,
    roundId,
    stage,
    teams: squads,
  };
}

export async function getLeagueWatchlist(opts: {
  leagueId?: number | null;
  leagueName?: string | null;
  roundId?: number;
  stage?: string;
  includePlayed?: boolean;
}): Promise<{
  leagueName: string | null;
  leagueId: number | null;
  roundId: number;
  stage: string;
  fixtures: Array<{
    fixture: SlimFixture & { dateIsrael: string; timeIsrael: string };
    appearanceCount: number;
    sides: Record<
      string,
      {
        nationTeamId: number;
        nationNameHe: string;
        nationFlag: string | null;
        teams: Array<{ fantasyTeamName: string; players: string[] }>;
      }
    >;
  }>;
  topGames: Array<{ fixtureId: string; label: string; appearanceCount: number }>;
}> {
  requireCookie("League watchlist");
  const stage = opts.stage || "group";
  const includePlayed = opts.includePlayed ?? false;
  const resolved = await resolveLeague(opts);
  const { teams: tableTeams, roundId: leagueRoundId, leagueName } = await fetchLeagueTeams(resolved.leagueId);
  const roundId = opts.roundId ?? leagueRoundId ?? 1;
  const { byId: registry } = await loadMarketAndNations();
  const allFixtures = await getAllFixtures();
  let roundFixtures = fixturesForFantasyRound(roundId, stage, allFixtures);
  if (!includePlayed) {
    roundFixtures = roundFixtures.filter((f) => !isFixturePlayed(f));
  }

  const squads = await pool(tableTeams, 5, async (t: any) => {
    try {
      const data = await s5get("/UserTeam/GetUserAndTeam", { userId: t.userId });
      const team = summarizeTeam(data);
      const allPlayers = [...team.starters, ...team.bench];
      return { teamName: t.name, players: allPlayers };
    } catch {
      return { teamName: t.name, players: [] as any[] };
    }
  });

  type SideEntry = {
    nationTeamId: number;
    nationNameHe: string;
    nationFlag: string | null;
    teams: Array<{ fantasyTeamName: string; players: string[] }>;
  };

  const fixtureMap = new Map<
    string,
    {
      fixture: SlimFixture;
      sides: Map<number, SideEntry>;
      appearanceCount: number;
    }
  >();

  for (const squad of squads) {
    for (const p of squad.players) {
      const fixture = matchNationToFixture(p.nationTeamId, roundFixtures, registry);
      if (!fixture) continue;
      const nation = registry[p.nationTeamId];
      if (!nation) continue;

      let entry = fixtureMap.get(fixture.id);
      if (!entry) {
        entry = { fixture, sides: new Map(), appearanceCount: 0 };
        fixtureMap.set(fixture.id, entry);
      }
      entry.appearanceCount++;

      let side = entry.sides.get(p.nationTeamId);
      if (!side) {
        side = {
          nationTeamId: p.nationTeamId,
          nationNameHe: nation.nameHe,
          nationFlag: nation.flagEmoji,
          teams: [],
        };
        entry.sides.set(p.nationTeamId, side);
      }
      let ft = side.teams.find((x) => x.fantasyTeamName === squad.teamName);
      if (!ft) {
        ft = { fantasyTeamName: squad.teamName, players: [] };
        side.teams.push(ft);
      }
      if (!ft.players.includes(p.name)) ft.players.push(p.name);
    }
  }

  const fixtures = [...fixtureMap.values()]
    .map(({ fixture, sides, appearanceCount }) => {
      const il = formatIsraelTime(fixture.date, fixture.time);
      const sidesObj: Record<string, SideEntry> = {};
      for (const [k, v] of sides) sidesObj[String(k)] = v;
      return {
        fixture: { ...fixture, dateIsrael: il.dateHe, timeIsrael: il.timeHe },
        appearanceCount,
        sides: sidesObj,
      };
    })
    .sort((a, b) => {
      const da = `${a.fixture.date || ""} ${a.fixture.time || ""}`;
      const db = `${b.fixture.date || ""} ${b.fixture.time || ""}`;
      return da.localeCompare(db);
    });

  const topGames = fixtures
    .map((f) => ({
      fixtureId: f.fixture.id,
      label: `${f.fixture.homeTeam ?? "?"} vs ${f.fixture.awayTeam ?? "?"}`,
      appearanceCount: f.appearanceCount,
    }))
    .sort((a, b) => b.appearanceCount - a.appearanceCount)
    .slice(0, 10);

  return {
    leagueName: leagueName ?? resolved.leagueName,
    leagueId: resolved.leagueId,
    roundId,
    stage,
    fixtures,
    topGames,
  };
}
