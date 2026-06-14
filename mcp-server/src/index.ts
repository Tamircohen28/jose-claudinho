#!/usr/bin/env node
/**
 * Fantasy World Cup 2026 (Sport5) MCP server.
 *
 * Read-and-recommend only: it reads the market, your team, rivals' teams,
 * league tables and fixtures, persists weekly snapshots, and exposes the
 * official game rules. It never performs writes (transfers/lineup/captain).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { s5get, requireCookie, Sport5Error, hasCookie } from "./sport5Client.js";
import {
  flattenMarket,
  slimPlayer,
  summarizeTeam,
  positionLabel,
} from "./transform.js";
import { rulesForStage } from "./rules.js";
import { getFixtures } from "./fixtures.js";
import { buildSnapshot, analyzeOwnership } from "./analysis.js";
import { writeSnapshot, listSnapshots, readSnapshot, dataDir } from "./storage.js";
import {
  getTeamRoundUtilization,
  getLeagueRoundUtilization,
  getLeagueWatchlist,
} from "./roundUtilization.js";

const server = new McpServer({
  name: "fantasy-wc",
  version: "1.0.0",
});

/** Build a standard tool result with both human text and structured data. */
function result(structured: any, summary: string) {
  return {
    content: [{ type: "text" as const, text: summary }],
    structuredContent: structured,
  };
}

function errorResult(e: any) {
  const msg = e instanceof Sport5Error ? e.message : `Error: ${e?.message || e}`;
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: msg }],
  };
}

const POSITIONS = "1=GK, 2=DEF, 3=MID, 4=FWD";

// ----------------------------------------------------------------------------
// 1. List players (the market) — filterable, sortable, paginated.
// ----------------------------------------------------------------------------
server.registerTool(
  "sport5_list_players",
  {
    title: "List market players",
    description:
      "List all selectable Fantasy WC players (1000+). Supports filtering by " +
      `position (${POSITIONS}), national team, max price, name substring, and ` +
      "availability; sorting; and pagination. Returns slim records with price, " +
      "season/last-round points and points-per-million.",
    inputSchema: {
      position: z.number().int().min(1).max(4).optional().describe(POSITIONS),
      nationTeamId: z.number().int().optional().describe("Filter to one national team id."),
      maxPriceM: z.number().optional().describe("Max price in millions, e.g. 9 for 9M."),
      minPriceM: z.number().optional().describe("Min price in millions."),
      nameContains: z.string().optional().describe("Case-insensitive substring of the player name (Hebrew)."),
      excludeUnavailable: z
        .boolean()
        .optional()
        .describe("Exclude injured/expelled/missing players (default false)."),
      sortBy: z
        .enum(["price_desc", "price_asc", "season_points", "last_round_points", "points_per_million"])
        .optional()
        .describe("Sort order (default price_desc)."),
      limit: z.number().int().min(1).max(200).optional().describe("Page size (default 50)."),
      offset: z.number().int().min(0).optional().describe("Page offset (default 0)."),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async (args) => {
    try {
      const raw = await s5get("/Players/GetTeamsAndPlayers");
      let players = flattenMarket(raw).map(slimPlayer);

      if (args.position) players = players.filter((p) => p.position === positionLabel(args.position!));
      if (args.nationTeamId != null) players = players.filter((p) => p.nationTeamId === args.nationTeamId);
      if (args.maxPriceM != null) players = players.filter((p) => p.priceM <= args.maxPriceM!);
      if (args.minPriceM != null) players = players.filter((p) => p.priceM >= args.minPriceM!);
      if (args.nameContains) {
        const q = args.nameContains.toLowerCase();
        players = players.filter((p) => p.name.toLowerCase().includes(q));
      }
      if (args.excludeUnavailable) players = players.filter((p) => p.available);

      const sortBy = args.sortBy || "price_desc";
      const cmp: Record<string, (a: any, b: any) => number> = {
        price_desc: (a, b) => b.priceM - a.priceM,
        price_asc: (a, b) => a.priceM - b.priceM,
        season_points: (a, b) => (b.seasonPoints ?? -1) - (a.seasonPoints ?? -1),
        last_round_points: (a, b) => (b.lastRoundPoints ?? -1) - (a.lastRoundPoints ?? -1),
        points_per_million: (a, b) => (b.pointsPerMillion ?? -1) - (a.pointsPerMillion ?? -1),
      };
      players.sort(cmp[sortBy]);

      const total = players.length;
      const offset = args.offset ?? 0;
      const limit = args.limit ?? 50;
      const page = players.slice(offset, offset + limit);

      const structured = { total, returned: page.length, offset, limit, sortBy, players: page };
      const summary =
        `${total} players match (showing ${page.length} from offset ${offset}, sorted by ${sortBy}).\n` +
        page
          .slice(0, 15)
          .map(
            (p) =>
              `• ${p.name} [${p.position}] ${p.priceM}M — season ${p.seasonPoints ?? "–"}pts, ` +
              `${p.pointsPerMillion ?? "–"} pts/M${p.available ? "" : " ⚠unavailable"}`
          )
          .join("\n");
      return result(structured, summary);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ----------------------------------------------------------------------------
// 2. My team (requires cookie).
// ----------------------------------------------------------------------------
server.registerTool(
  "sport5_get_my_team",
  {
    title: "Get my team",
    description:
      "Get YOUR current squad (requires SPORT5_COOKIE): starting XI vs bench, " +
      "captain/vice, formation, budget used, players-per-national-team counts, " +
      "and last-round point breakdowns.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async () => {
    try {
      requireCookie("Reading your own team");
      const data = await s5get("/Account/GetConnectedUserAndTeam");
      const team = summarizeTeam(data);
      const summary =
        `${team.teamName} (mgr ${team.managerName}) — ${team.usedBudgetM}M used, formation ${team.formation}, ` +
        `${team.points} pts.\nCaptain id ${team.captainId}, vice id ${team.viceCaptainId}. ` +
        `Bonuses used: ${team.bonusesUsed.length}.`;
      return result(team, summary);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ----------------------------------------------------------------------------
// 3. Any user's team.
// ----------------------------------------------------------------------------
server.registerTool(
  "sport5_get_user_team",
  {
    title: "Get a user's team",
    description:
      "Get any user's squad by userId (e.g. a top-ranked rival from a league table). " +
      "Same shape as get_my_team, including bonuses used and round points. " +
      "Requires SPORT5_COOKIE (this endpoint is login-gated, even for other users).",
    inputSchema: {
      userId: z.number().int().describe("The user id whose squad to fetch."),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async (args) => {
    try {
      requireCookie("Reading a user's team");
      const data = await s5get("/UserTeam/GetUserAndTeam", { userId: args.userId });
      const team = summarizeTeam(data);
      const summary =
        `${team.teamName} (${team.managerName}) — ${team.usedBudgetM}M used, formation ${team.formation}, ` +
        `${team.points} pts. Captain id ${team.captainId}, vice id ${team.viceCaptainId}.`;
      return result(team, summary);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ----------------------------------------------------------------------------
// 4. My leagues summary (requires cookie).
// ----------------------------------------------------------------------------
server.registerTool(
  "sport5_get_my_leagues",
  {
    title: "Get my leagues",
    description:
      "Get YOUR standing across all leagues you belong to (requires SPORT5_COOKIE): " +
      "overall Sport5 league, favourite-team league, and private leagues, with " +
      "position, weekly position and each league's current leader.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async () => {
    try {
      requireCookie("Reading your leagues");
      const data = await s5get("/CustomLeagues/GetLeaguesSummary");
      const leagues = (data || []).map((l: any) => ({
        leagueId: l.id,
        leagueName: l.leagueName,
        teamName: l.name,
        userName: l.userName,
        totalScore: l.totalScore,
        roundScore: l.roundScore,
        position: l.position,
        weeklyPosition: l.weeklyPosition,
        leaderName: l.weeklyLeaderName,
        leaderTeam: l.weeklyLeaderTeamName,
        leaderTotalPoints: l.weeklyLeaderTotalPoints,
        leaguePointsAvg: l.leaguePointsAvg,
      }));
      const summary = leagues
        .map(
          (l: any) =>
            `• ${l.leagueName ?? "(overall)"}: position ${l.position} (${l.totalScore} pts). ` +
            `Leader: ${l.leaderTeam} @ ${l.leaderTotalPoints} pts.`
        )
        .join("\n");
      return result({ leagues }, summary || "No leagues found.");
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ----------------------------------------------------------------------------
// 5. League table (paginated).
// ----------------------------------------------------------------------------
server.registerTool(
  "sport5_get_league_table",
  {
    title: "Get league table",
    description:
      "Get a league's standings, paginated. Pass leagueId for a private league, " +
      "teamId for a favourite-team league, or leave both null for the overall " +
      "Sport5 league. Each page returns ~50 teams; use pageIndex to advance. " +
      "Requires SPORT5_COOKIE (league data is login-gated).",
    inputSchema: {
      leagueId: z.number().int().nullable().optional().describe("Private league id (null for general)."),
      teamId: z.number().int().nullable().optional().describe("Favourite national-team id (null for general)."),
      isPerRound: z.boolean().optional().describe("Rank by per-round score (true) vs total (default true)."),
      pageIndex: z.number().int().min(0).optional().describe("Zero-based page index (default 0)."),
      searchText: z.string().optional().describe("Filter by team/manager name."),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async (args) => {
    try {
      requireCookie("Reading a league table");
      const data = await s5get("/CustomLeagues/GetLeagueData", {
        leagueId: args.leagueId ?? null,
        teamId: args.teamId ?? null,
        isPerRound: args.isPerRound ?? true,
        pageIndex: args.pageIndex ?? 0,
        searchText: args.searchText ?? "",
      });
      const teams = (data.teams || []).map((t: any) => ({
        userId: t.userId,
        teamName: t.name,
        userName: t.userName,
        totalScore: t.totalScore,
        roundScore: t.roundScore,
        position: t.position,
        weeklyPosition: t.weeklyPosition,
        favTeamId: t.favTeamId,
      }));
      const structured = {
        leagueName: data.leagueName,
        roundId: data.roundId ?? null,
        pageIndex: args.pageIndex ?? 0,
        returned: teams.length,
        teams,
      };
      const summary =
        `${data.leagueName ?? "Overall league"} — page ${args.pageIndex ?? 0}, ${teams.length} teams.\n` +
        teams
          .slice(0, 15)
          .map((t: any) => `${t.position}. ${t.teamName} (${t.userName}) — ${t.totalScore} pts [user ${t.userId}]`)
          .join("\n");
      return result(structured, summary);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ----------------------------------------------------------------------------
// 6. World Cup fixtures (TheSportsDB).
// ----------------------------------------------------------------------------
server.registerTool(
  "worldcup_fixtures",
  {
    title: "World Cup fixtures",
    description:
      "Get World Cup 2026 fixtures/results from TheSportsDB. when=next (upcoming), " +
      "past (recent results), or all (full season). Optional team-name filter. " +
      "Note: external team names won't map cleanly to the game's Hebrew names.",
    inputSchema: {
      when: z.enum(["next", "past", "all"]).optional().describe("Which fixtures (default next)."),
      limit: z.number().int().min(1).max(100).optional().describe("Max fixtures (default 20)."),
      teamContains: z.string().optional().describe("Filter to fixtures involving a team name substring."),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async (args) => {
    try {
      const res = await getFixtures({ when: args.when, limit: args.limit, teamContains: args.teamContains });
      const summary =
        (res.note ? res.note + "\n" : "") +
        res.fixtures
          .map(
            (f) =>
              `${f.date ?? "?"} ${f.time ?? ""} — ${f.homeTeam ?? "?"} ${
                f.homeScore ?? "vs"
              } ${f.awayScore ?? ""} ${f.awayTeam ?? "?"}${f.round ? ` (R${f.round})` : ""}`
          )
          .join("\n");
      return result(res, summary || res.note || "No fixtures.");
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ----------------------------------------------------------------------------
// 7. Snapshot top teams (persist for learning).
// ----------------------------------------------------------------------------
server.registerTool(
  "snapshot_top_teams",
  {
    title: "Snapshot top teams",
    description:
      "Capture the current top-N teams in a league (default the overall league), " +
      "fetch each of their squads + the full market, and save a timestamped JSON " +
      "snapshot locally for week-over-week learning. Fetches N+ requests, so keep " +
      "topN reasonable (default 50). Requires SPORT5_COOKIE (league + squad data " +
      "is login-gated).",
    inputSchema: {
      topN: z.number().int().min(1).max(100).optional().describe("How many top teams to capture (default 50)."),
      leagueId: z.number().int().nullable().optional().describe("League id (null = overall Sport5 league)."),
      isPerRound: z.boolean().optional().describe("Rank by per-round score (default true)."),
    },
    annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
  },
  async (args) => {
    try {
      requireCookie("Snapshotting top teams");
      const topN = args.topN ?? 50;
      const snapshot = await buildSnapshot({
        topN,
        leagueId: args.leagueId ?? null,
        isPerRound: args.isPerRound ?? true,
      });
      const { file, path } = await writeSnapshot(snapshot);
      const captured = snapshot.squads.filter((s: any) => !s.error).length;
      const structured = {
        file,
        path,
        topN,
        roundId: snapshot.roundId,
        squadsCaptured: captured,
        squadsFailed: snapshot.squads.length - captured,
      };
      return result(
        structured,
        `Saved snapshot ${file} — captured ${captured}/${snapshot.squads.length} squads from the top ${topN}.`
      );
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ----------------------------------------------------------------------------
// 8. Analyze ownership over a snapshot.
// ----------------------------------------------------------------------------
server.registerTool(
  "analyze_ownership",
  {
    title: "Analyze top-team ownership",
    description:
      "Analyze a stored snapshot: most-owned players among the top teams, captain " +
      "popularity, best points-per-million, and differentials (high points, low " +
      "ownership). Use snapshot='latest' for the most recent capture.",
    inputSchema: {
      snapshot: z.string().optional().describe("Snapshot filename, or 'latest' (default)."),
      position: z.enum(["GK", "DEF", "MID", "FWD"]).optional().describe("Restrict to one position."),
      topN: z.number().int().min(1).max(100).optional().describe("Rows per ranked list (default 25)."),
    },
    annotations: { readOnlyHint: true },
  },
  async (args) => {
    try {
      const snap = await readSnapshot(args.snapshot || "latest");
      const analysis = analyzeOwnership(snap, { position: args.position, topN: args.topN });
      if ((analysis as any).error) return errorResult(new Error((analysis as any).error));
      const a = analysis as any;
      const fmt = (rows: any[]) =>
        rows
          .slice(0, 10)
          .map((r) => `  • ${r.name} [${r.position}] ${r.priceM ?? "?"}M — ${r.ownershipPct}% owned, ${r.seasonPoints ?? "–"}pts`)
          .join("\n");
      const summary =
        `Analyzed ${a.squadsAnalyzed} top squads (round ${a.roundId}).\n` +
        `Most owned:\n${fmt(a.mostOwned)}\n` +
        `Top captains:\n${a.topCaptains.slice(0, 5).map((r: any) => `  • ${r.name} — ${r.captaincyPct}%`).join("\n")}\n` +
        `Best value:\n${fmt(a.bestValue)}\n` +
        `Differentials:\n${fmt(a.differentials)}`;
      return result(a, summary);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ----------------------------------------------------------------------------
// 9. List snapshots.
// ----------------------------------------------------------------------------
server.registerTool(
  "list_snapshots",
  {
    title: "List stored snapshots",
    description: "List locally stored top-team snapshots with capture date, round, size and squad count.",
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  async () => {
    try {
      const metas = await listSnapshots();
      const summary =
        metas.length === 0
          ? `No snapshots yet in ${dataDir()}. Run snapshot_top_teams.`
          : metas
              .map((m) => `• ${m.file} — ${m.capturedAt}, round ${m.roundId ?? "?"}, ${m.squadsCaptured} squads`)
              .join("\n");
      return result({ dataDir: dataDir(), snapshots: metas }, summary);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ----------------------------------------------------------------------------
// 10. Game rules.
// ----------------------------------------------------------------------------
server.registerTool(
  "get_game_rules",
  {
    title: "Get game rules",
    description:
      "Return the official Fantasy WC 2026 rules for a given tournament stage: " +
      "squad/formation constraints, per-stage budget and max-players-per-national-team, " +
      "transfer counts, the full scoring table, captaincy rules, and the four bonus chips.",
    inputSchema: {
      stage: z
        .enum(["group", "r32", "r16", "qf", "sf", "final"])
        .optional()
        .describe("Tournament stage (default group). Drives budget, team cap, and transfers."),
    },
    annotations: { readOnlyHint: true },
  },
  async (args) => {
    const rules = rulesForStage(args.stage);
    const s = rules.stage;
    const summary =
      `${s.label}: budget ${s.budgetM}M, max ${s.maxPerNationalTeam} players per national team, ` +
      `${s.transfersPerRound} transfers/round. Squad 15 (11 XI + 4 bench). ` +
      `Goals: GK ${rules.scoring.goalByPosition.GK}/DEF ${rules.scoring.goalByPosition.DEF}/` +
      `MID ${rules.scoring.goalByPosition.MID}/FWD ${rules.scoring.goalByPosition.FWD}; assist ${rules.scoring.assist}; ` +
      `clean sheet (GK/DEF) 4; captain x2.`;
    return result(rules, summary);
  }
);

// ----------------------------------------------------------------------------
// 11. Team round utilization.
// ----------------------------------------------------------------------------
server.registerTool(
  "team_round_utilization",
  {
    title: "Team round utilization",
    description:
      "For one fantasy team, list all 15 players with their national-team fixture in the " +
      "current round, whether that match already played, and round points if available. " +
      "Requires SPORT5_COOKIE.",
    inputSchema: {
      userId: z.number().int().optional().describe("User id (default: your connected team)."),
      leagueId: z.number().int().nullable().optional().describe("League id for teamName lookup."),
      teamName: z.string().optional().describe("Fantasy team name substring to find userId in league."),
      roundId: z.number().int().optional().describe("Sport5 fantasy round (default from team/league)."),
      stage: z
        .enum(["group", "r32", "r16", "qf", "sf", "final"])
        .optional()
        .describe("Tournament stage (default group)."),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async (args) => {
    try {
      const data = await getTeamRoundUtilization(args);
      const summary =
        `${data.teamName} — round ${data.roundId} (${data.stage}): ` +
        `${data.summary.played} played, ${data.summary.upcoming} upcoming / ${data.summary.total}.\n` +
        data.players
          .slice(0, 15)
          .map(
            (p) =>
              `• ${p.name} (${p.nationNameHe}) — ${p.played ? `played ${p.roundPoints ?? 0}pts` : `upcoming ${p.fixture?.dateIsrael ?? ""} ${p.fixture?.timeIsrael ?? ""}`}`
          )
          .join("\n");
      return result(data, summary);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ----------------------------------------------------------------------------
// 12. League round utilization.
// ----------------------------------------------------------------------------
server.registerTool(
  "league_round_utilization",
  {
    title: "League round utilization",
    description:
      "For a league, show how many players per fantasy team have already played vs still " +
      "waiting on their national-team match this round (all 15 squad players). " +
      "Pass leagueName or leagueId. Max 50 teams. Requires SPORT5_COOKIE.",
    inputSchema: {
      leagueId: z.number().int().nullable().optional().describe("Private league id."),
      leagueName: z.string().optional().describe("League name substring (from your leagues)."),
      roundId: z.number().int().optional().describe("Sport5 fantasy round (default from league)."),
      stage: z
        .enum(["group", "r32", "r16", "qf", "sf", "final"])
        .optional()
        .describe("Tournament stage (default group)."),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async (args) => {
    try {
      const data = await getLeagueRoundUtilization(args);
      const summary =
        `${data.leagueName ?? "League"} — round ${data.roundId}: ${data.teams.length} teams.\n` +
        data.teams
          .map(
            (t) =>
              `• ${t.teamName}: ${t.empty ? "no players" : `${t.played} played / ${t.upcoming} upcoming (${t.total})`}`
          )
          .join("\n");
      return result(data, summary);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ----------------------------------------------------------------------------
// 13. League watchlist (games of interest).
// ----------------------------------------------------------------------------
server.registerTool(
  "league_watchlist",
  {
    title: "League watchlist",
    description:
      "For a league, list upcoming round fixtures where at least one league player is " +
      "involved — grouped by match with fantasy-team → player mapping. " +
      "Requires SPORT5_COOKIE.",
    inputSchema: {
      leagueId: z.number().int().nullable().optional().describe("Private league id."),
      leagueName: z.string().optional().describe("League name substring (from your leagues)."),
      roundId: z.number().int().optional().describe("Sport5 fantasy round (default from league)."),
      stage: z
        .enum(["group", "r32", "r16", "qf", "sf", "final"])
        .optional()
        .describe("Tournament stage (default group)."),
      includePlayed: z
        .boolean()
        .optional()
        .describe("Include already-played fixtures (default false)."),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async (args) => {
    try {
      const data = await getLeagueWatchlist(args);
      const summary =
        `${data.leagueName ?? "League"} watchlist — round ${data.roundId}, ${data.fixtures.length} fixtures.\n` +
        data.fixtures
          .slice(0, 10)
          .map(
            (f) =>
              `${f.fixture.dateIsrael} ${f.fixture.timeIsrael} — ${f.fixture.homeTeam} vs ${f.fixture.awayTeam} (${f.appearanceCount} league picks)`
          )
          .join("\n");
      return result(data, summary);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ----------------------------------------------------------------------------
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Surface cookie state to stderr (never stdout — that's the protocol channel).
  console.error(
    `[fantasy-wc] MCP server ready. Cookie ${hasCookie() ? "present" : "MISSING (private reads disabled)"}. Data dir: ${dataDir()}`
  );
}

main().catch((e) => {
  console.error("[fantasy-wc] fatal:", e);
  process.exit(1);
});
