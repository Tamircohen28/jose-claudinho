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
import {
  buildFixtureDifficulty,
  computePlayerEV,
  computeSquadEV,
  evaluateTransfer,
  evaluateChips,
  type OpponentTier,
  type FixtureDifficulty,
} from "./scoring.js";
import {
  buildGroupStandings,
  predictProbableMatchups,
  deriveOpponentTierFromForm,
  type FixtureResult,
} from "./bracketPredictor.js";
import { getFixtures } from "./fixtures.js";
import { buildSnapshot, analyzeOwnership } from "./analysis.js";
import { writeSnapshot, listSnapshots, readSnapshot, dataDir } from "./storage.js";
import {
  getTeamRoundUtilization,
  getLeagueRoundUtilization,
  getLeagueWatchlist,
} from "./roundUtilization.js";
import { fetchAndCacheInjuries } from "./injuryClient.js";
import { fetchAndCacheLineupPredictions } from "./lineupScraper.js";
import { buildAvailabilityMap, buildLineupMap } from "./playerMapping.js";
import { buildNationRegistry } from "./nations.js";

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
// 14. Compute squad EV (expected value engine).
// ----------------------------------------------------------------------------
server.registerTool(
  "compute_squad_ev",
  {
    title: "Compute squad expected value",
    description:
      "Given a list of players (from your squad or transfer candidates) and their " +
      "upcoming fixture difficulties, compute expected Fantasy points (EV) for each " +
      "player. Returns per-player EV breakdown (goals, assists, clean sheet, cards, " +
      "penalties), best captain pick, and chip timing recommendations. " +
      "All inputs are pure data — no Sport5 cookie required for this tool itself.",
    inputSchema: {
      players: z
        .array(
          z.object({
            playerId: z.number().int(),
            playerName: z.string(),
            position: z.number().int().min(1).max(4).describe("1=GK 2=DEF 3=MID 4=FWD"),
            priceM: z.number().describe("Player price in millions"),
            isStarter: z.boolean().optional().describe("True if in starting XI (default true)"),
            formMultiplier: z
              .number()
              .min(0)
              .max(2)
              .optional()
              .describe("Adjust EV for form: >1 in-form, <1 out-of-form (default 1.0)"),
            fixtures: z.array(
              z.object({
                opponent: z.string(),
                tier: z
                  .enum(["elite", "strong", "medium", "weak"])
                  .describe(
                    "Opponent strength: elite=Brazil/France/Argentina/England, " +
                    "strong=Portugal/Netherlands/Germany, medium=USA/Japan/Morocco, weak=remainder"
                  ),
                fixtureId: z.string().optional(),
              })
            ).describe("Upcoming fixtures for this player's national team"),
          })
        )
        .describe("Players to evaluate (squad members or transfer candidates)"),
      starterIds: z
        .array(z.number().int())
        .optional()
        .describe("Player IDs that are in the starting XI (for squad EV split). Defaults to all players."),
      chipsUsed: z
        .array(z.string())
        .optional()
        .describe("Chip keys already used this season: triple_captain, five_subs, double_captains, all_squad_points"),
      roundsRemaining: z
        .number()
        .int()
        .min(1)
        .max(6)
        .optional()
        .describe("Rounds remaining in the tournament (default 3)"),
      stage: z
        .enum(["group", "r32", "r16", "qf", "sf", "final"])
        .optional()
        .describe("Current tournament stage (default group)"),
      availabilityData: z
        .array(
          z.object({
            playerId: z.number().int(),
            status: z.enum(["injured", "suspended", "doubtful", "fit"]),
          })
        )
        .optional()
        .describe(
          "Per-player availability from get_player_availability. " +
          "injured/suspended → formMultiplier=0; doubtful → formMultiplier=0.4; fit → 1.0 (default). " +
          "Overrides any per-player formMultiplier already in the players array."
        ),
      lineupData: z
        .array(
          z.object({
            playerId: z.number().int(),
            predictedStarter: z.boolean(),
            confidence: z.number().min(0).max(1).optional(),
          })
        )
        .optional()
        .describe(
          "Per-player lineup predictions from get_lineup_predictions. " +
          "Overrides per-player isStarter and the starterIds list."
        ),
    },
    annotations: { readOnlyHint: true },
  },
  async (args) => {
    try {
      // Build availability and lineup override maps from optional enrichment data
      const availOverride = new Map<number, number>(); // playerId → formMultiplier
      for (const a of args.availabilityData ?? []) {
        const fm =
          a.status === "injured" || a.status === "suspended" ? 0
          : a.status === "doubtful" ? 0.4
          : 1.0;
        availOverride.set(a.playerId, fm);
      }

      const lineupOverride = new Map<number, boolean>(); // playerId → predictedStarter
      for (const l of args.lineupData ?? []) {
        lineupOverride.set(l.playerId, l.predictedStarter);
      }

      const playerEVs = args.players.map((p) => {
        const fixtures: FixtureDifficulty[] = (p.fixtures ?? []).map((f) =>
          buildFixtureDifficulty(f.tier as OpponentTier, f.opponent, f.fixtureId)
        );
        // availabilityData overrides per-player formMultiplier
        const formMultiplier = availOverride.has(p.playerId)
          ? availOverride.get(p.playerId)!
          : (p.formMultiplier ?? 1.0);
        return computePlayerEV(
          p.playerId,
          p.playerName,
          p.position,
          p.priceM,
          fixtures,
          formMultiplier
        );
      });

      // Build starter set: lineupData overrides starterIds overrides per-player isStarter
      const starterSet = new Set<number>();
      for (const p of args.players) {
        let isStarter: boolean;
        if (lineupOverride.has(p.playerId)) {
          isStarter = lineupOverride.get(p.playerId)!;
        } else if (args.starterIds) {
          isStarter = args.starterIds.includes(p.playerId);
        } else {
          isStarter = p.isStarter ?? true;
        }
        if (isStarter) starterSet.add(p.playerId);
      }

      const squadEV = computeSquadEV(playerEVs, starterSet);

      const chips = evaluateChips({
        squadEV,
        roundsRemaining: args.roundsRemaining ?? 3,
        chipsUsed: args.chipsUsed ?? [],
        stage: args.stage ?? "group",
      });

      const sorted = [...playerEVs].sort((a, b) => b.totalEV - a.totalEV);
      const summary =
        `Squad EV: ${squadEV.totalStartingXIEV.toFixed(1)} pts (XI) + ${squadEV.totalBenchEV.toFixed(1)} pts (bench).\n` +
        `Best captain: ${squadEV.bestCaptainName} (${(playerEVs.find((p) => p.playerId === squadEV.bestCaptainId)?.totalEV ?? 0).toFixed(1)} EV → ×2 = ${squadEV.bestCaptainEVGain.toFixed(1)} extra pts).\n` +
        `Top 5 by EV:\n` +
        sorted
          .slice(0, 5)
          .map(
            (p) =>
              `  ${p.playerName} [${["", "GK", "DEF", "MID", "FWD"][p.position]}] ${p.fixtureCount} fixture(s) → ${p.totalEV.toFixed(1)} EV (${p.evPerMillion.toFixed(2)} per M)`
          )
          .join("\n") +
        `\nChip advice:\n` +
        chips
          .filter((c) => !c.alreadyUsed)
          .map((c) => `  ${c.recommendNow ? "✅ USE NOW" : "⏳ hold"} ${c.chipLabel}: ${c.rationale}`)
          .join("\n");

      return result({ squadEV, chips, players: playerEVs }, summary);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ----------------------------------------------------------------------------
// 15. Predict bracket matchups from group results.
// ----------------------------------------------------------------------------
server.registerTool(
  "predict_bracket_matchups",
  {
    title: "Predict bracket matchups",
    description:
      "Given World Cup group-stage fixture results, compute current group standings, " +
      "estimate P(advance) per team, derive expected additional rounds for each national " +
      "team's players, and predict probable Round-of-32 matchups. " +
      "Feed in results from worldcup_fixtures (past). No cookie required.",
    inputSchema: {
      results: z
        .array(
          z.object({
            homeTeam: z.string(),
            awayTeam: z.string(),
            homeScore: z.number().int(),
            awayScore: z.number().int(),
            group: z.string().optional().describe("Group letter A–L"),
            round: z.number().int().optional().describe("Matchday 1, 2, or 3"),
            stage: z.string().optional().describe("'group', 'r32', etc."),
            date: z.string().optional(),
          })
        )
        .describe("Played fixture results from worldcup_fixtures (past)"),
    },
    annotations: { readOnlyHint: true },
  },
  async (args) => {
    try {
      const standings = buildGroupStandings(args.results as FixtureResult[]);
      const prediction = predictProbableMatchups(standings);

      const groupSummary = prediction.groups
        .map((g) => {
          const teams = g.teams
            .map(
              (t) =>
                `    ${t.groupRank}. ${t.teamName} — ${t.points}pts (${t.played}G ${t.won}W ${t.drawn}D ${t.lost}L, GD${t.gd > 0 ? "+" : ""}${t.gd}) P(advance)=${(t.probAdvanceFromGroup * 100).toFixed(0)}%`
            )
            .join("\n");
          return `  Group ${g.group}${g.isComplete ? " ✓" : ""}:\n${teams}`;
        })
        .join("\n");

      const matchupSummary = prediction.probableMatchups
        .slice(0, 8)
        .map(
          (m) =>
            `  ${m.team1} vs ${m.team2} — matchup P=${(m.matchupProbability * 100).toFixed(0)}%`
        )
        .join("\n");

      const summary =
        `=== Group Standings ===\n${groupSummary}\n\n` +
        `=== Probable R32 Matchups (top 8) ===\n${matchupSummary}`;

      return result(prediction, summary);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ----------------------------------------------------------------------------
// 16. Rank transfer candidates.
// ----------------------------------------------------------------------------
server.registerTool(
  "rank_transfer_candidates",
  {
    title: "Rank transfer candidates",
    description:
      "Given your current squad (from get_my_team) and a list of transfer candidates " +
      "(from list_players), evaluate each (player_out, player_in) swap for EV gain, " +
      "budget feasibility, and national-team cap compliance. Returns the top N swaps " +
      "ranked by expected point gain. Provide player EVs from compute_squad_ev.",
    inputSchema: {
      squadPlayers: z
        .array(
          z.object({
            playerId: z.number().int(),
            playerName: z.string(),
            position: z.number().int().min(1).max(4),
            priceM: z.number(),
            totalEV: z.number().describe("EV from compute_squad_ev"),
            nationTeamId: z.number().int(),
            isStarter: z.boolean().optional(),
          })
        )
        .describe("Your current 15-player squad with EVs from compute_squad_ev"),
      candidates: z
        .array(
          z.object({
            playerId: z.number().int(),
            playerName: z.string(),
            position: z.number().int().min(1).max(4),
            priceM: z.number(),
            totalEV: z.number().describe("EV from compute_squad_ev"),
            nationTeamId: z.number().int(),
          })
        )
        .describe("Market players to consider bringing in"),
      freeBudgetM: z
        .number()
        .describe("Remaining free budget after selling everyone you sell (from get_my_team)"),
      maxPerNationalTeam: z
        .number()
        .int()
        .describe("Stage cap on players per national team (from get_game_rules)"),
      topN: z
        .number()
        .int()
        .min(1)
        .max(30)
        .optional()
        .describe("Return top N transfer candidates (default 10)"),
    },
    annotations: { readOnlyHint: true },
  },
  async (args) => {
    try {
      // Build nation team count map from current squad
      const nationCounts: Record<number, number> = {};
      for (const p of args.squadPlayers) {
        nationCounts[p.nationTeamId] = (nationCounts[p.nationTeamId] ?? 0) + 1;
      }

      const transfers = [];
      for (const playerOut of args.squadPlayers) {
        // Budget freed by selling this player
        const budgetAfterSell = args.freeBudgetM + playerOut.priceM;
        // Nation counts after removing playerOut
        const countsAfterSell = { ...nationCounts };
        countsAfterSell[playerOut.nationTeamId] = Math.max(0, (countsAfterSell[playerOut.nationTeamId] ?? 0) - 1);

        for (const playerIn of args.candidates) {
          // Skip if same player
          if (playerIn.playerId === playerOut.playerId) continue;
          // Skip if candidate already in squad
          if (args.squadPlayers.some((p) => p.playerId === playerIn.playerId)) continue;

          const outEV: import("./scoring.js").PlayerEV = {
            playerId: playerOut.playerId,
            playerName: playerOut.playerName,
            position: playerOut.position,
            price: playerOut.priceM,
            fixtureCount: 0,
            perFixtureEV: 0,
            totalEV: playerOut.totalEV,
            captainEV: playerOut.totalEV * 2,
            tripleCaptainEV: playerOut.totalEV * 3,
            evPerMillion: playerOut.priceM > 0 ? playerOut.totalEV / playerOut.priceM : 0,
            fixtures: [],
          };
          const inEV: import("./scoring.js").PlayerEV = {
            playerId: playerIn.playerId,
            playerName: playerIn.playerName,
            position: playerIn.position,
            price: playerIn.priceM,
            fixtureCount: 0,
            perFixtureEV: 0,
            totalEV: playerIn.totalEV,
            captainEV: playerIn.totalEV * 2,
            tripleCaptainEV: playerIn.totalEV * 3,
            evPerMillion: playerIn.priceM > 0 ? playerIn.totalEV / playerIn.priceM : 0,
            fixtures: [],
          };

          const t = evaluateTransfer({
            playerOut: outEV,
            playerIn: inEV,
            budgetM: budgetAfterSell,
            nationTeamCounts: countsAfterSell,
            playerOutNationId: playerOut.nationTeamId,
            playerInNationId: playerIn.nationTeamId,
            maxPerNationalTeam: args.maxPerNationalTeam,
          });
          transfers.push(t);
        }
      }

      const topN = args.topN ?? 10;
      const feasible = transfers
        .filter((t) => t.isFeasible)
        .sort((a, b) => b.evGain - a.evGain)
        .slice(0, topN);

      const summary =
        `Top ${feasible.length} feasible transfers (ranked by EV gain):\n` +
        feasible
          .map(
            (t, i) =>
              `${i + 1}. OUT ${t.playerOutName} → IN ${t.playerInName} | +${t.evGain.toFixed(1)} EV | budget Δ${t.budgetDelta > 0 ? "+" : ""}${t.budgetDelta.toFixed(1)}M`
          )
          .join("\n");

      return result({ transfers: feasible, totalEvaluated: transfers.length }, summary);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ----------------------------------------------------------------------------
// 17. Get player availability (injury / suspension feed).
// ----------------------------------------------------------------------------
server.registerTool(
  "get_player_availability",
  {
    title: "Get player availability (injuries & suspensions)",
    description:
      "Returns players with injury or suspension concerns, merging Sport5's own status " +
      "flags with external data from API-Football (requires API_FOOTBALL_KEY env var). " +
      "Results are cached for 6 hours. Use forceRefresh=true to bypass the cache. " +
      "Sport5 flags always take precedence over external data.",
    inputSchema: {
      forceRefresh: z
        .boolean()
        .optional()
        .describe("Ignore the 6-hour cache and re-fetch from all sources (default false)."),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async (args) => {
    try {
      const raw = await s5get("/Players/GetTeamsAndPlayers");
      const allPlayers = flattenMarket(raw).map(slimPlayer);
      const { byId: nationRegistry } = buildNationRegistry(raw);

      const { injuries, cachedAt, fromCache, apiKeyPresent } = await fetchAndCacheInjuries(
        args.forceRefresh ?? false
      );

      const availMap = await buildAvailabilityMap(injuries, allPlayers, nationRegistry);

      // Ensure Sport5-flagged unavailable players are always included
      for (const p of allPlayers) {
        if (!p.available && !availMap.has(p.id)) {
          const status = p.expelled ? "suspended" as const : "injured" as const;
          availMap.set(p.id, { playerId: p.id, playerNameHe: p.name, status, source: "sport5" });
        }
      }

      const players = [...availMap.values()];
      const injuredCount = players.filter((p) => p.status === "injured").length;
      const suspendedCount = players.filter((p) => p.status === "suspended").length;
      const doubtfulCount = players.filter((p) => p.status === "doubtful").length;

      const structured = {
        cachedAt,
        fromCache,
        apiKeyPresent,
        totalUnavailable: players.length,
        injuredCount,
        suspendedCount,
        doubtfulCount,
        players,
      };
      const summary =
        `${players.length} players with availability concerns (cached: ${fromCache}, API key: ${apiKeyPresent ? "yes" : "no — add API_FOOTBALL_KEY for external data"}).\n` +
        `Injured: ${injuredCount} · Suspended: ${suspendedCount} · Doubtful: ${doubtfulCount}\n` +
        players
          .slice(0, 15)
          .map(
            (p) =>
              `• [${p.status.toUpperCase()}] ${p.playerNameHe}${p.reason ? ` — ${p.reason}` : ""} (${p.source})`
          )
          .join("\n");

      return result(structured, summary);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ----------------------------------------------------------------------------
// 18. Get lineup predictions (consensus from 3 scraped sources).
// ----------------------------------------------------------------------------
server.registerTool(
  "get_lineup_predictions",
  {
    title: "Get predicted starting lineups",
    description:
      "Fetches predicted starting XIs from FotMob, RotoWire and 365scores in parallel, " +
      "then builds a consensus: a player is listed as a predicted starter when they appear " +
      "in ≥ 2 of 3 sources. Returns per-national-team lists of Sport5 player IDs. " +
      "Results are cached for 2 hours. Lists unmatched player names (English → Hebrew " +
      "mapping failed) so you can add manual overrides to player-name-overrides.json.",
    inputSchema: {
      matchDates: z
        .array(z.string())
        .optional()
        .describe(
          "Dates to fetch predictions for (YYYY-MM-DD). Defaults to the next 7 days of WC fixtures."
        ),
      forceRefresh: z
        .boolean()
        .optional()
        .describe("Bypass the 2-hour cache (default false)."),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async (args) => {
    try {
      // Resolve match dates: use args or pull from upcoming fixtures
      let dates = args.matchDates ?? [];
      if (dates.length === 0) {
        const fixtureRes = await getFixtures({ when: "next", limit: 30 });
        const seen = new Set<string>();
        for (const f of fixtureRes.fixtures) {
          if (f.date && !seen.has(f.date)) {
            seen.add(f.date);
            if (seen.size >= 7) break;
          }
        }
        dates = [...seen];
      }

      const { lineups: consensusLineups, cachedAt, fromCache } =
        await fetchAndCacheLineupPredictions(dates, args.forceRefresh ?? false);

      const raw = await s5get("/Players/GetTeamsAndPlayers");
      const allPlayers = flattenMarket(raw).map(slimPlayer);
      const { byId: nationRegistry } = buildNationRegistry(raw);

      const lineupEntries = await buildLineupMap(consensusLineups, allPlayers, nationRegistry);

      const totalUnmatched = lineupEntries.reduce((s, t) => s + t.unmatchedNames.length, 0);
      const structured = { cachedAt, fromCache, matchDates: dates, teams: lineupEntries, totalUnmatched };
      const summary =
        `Lineup predictions for ${lineupEntries.length} teams — dates: ${dates.join(", ")} (cached: ${fromCache}).\n` +
        lineupEntries
          .slice(0, 12)
          .map((t) => {
            const unmatched =
              t.unmatchedNames.length
                ? ` ⚠ unmatched: ${t.unmatchedNames.join(", ")}`
                : "";
            return (
              `• ${t.teamNameEn}: ${t.predictedStarterIds.length} starters, ` +
              `conf ${(t.confidence * 100).toFixed(0)}%${unmatched}`
            );
          })
          .join("\n") +
        (totalUnmatched > 0
          ? `\n\nTip: add entries to player-name-overrides.json to fix unmatched names.`
          : "");

      return result(structured, summary);
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
