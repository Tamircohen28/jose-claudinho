/**
 * World Cup 2026 fixtures: official group-stage schedule (embedded) enriched
 * with live scores/times from TheSportsDB when available.
 *
 * Note: external team names won't map cleanly to the game's Hebrew names, but
 * nations.ts aliases bridge Sport5 ↔ English for round utilization.
 */

import { envOr } from "./env.js";
import { WC2026_GROUP_FIXTURES, type Wc2026GroupFixture } from "./wc2026Schedule.js";

function key(): string {
  return envOr("SPORTSDB_KEY", "3");
}

function leagueId(): string {
  // FIFA World Cup league id on TheSportsDB.
  return envOr("SPORTSDB_WC_LEAGUE_ID", "4429");
}

function season(): string {
  return envOr("SPORTSDB_WC_SEASON", "2026");
}

function base(): string {
  return `https://www.thesportsdb.com/api/v1/json/${key()}`;
}

export interface SlimFixture {
  id: string;
  name: string;
  round: string | null;
  date: string | null;
  time: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string | null;
  venue: string | null;
}

function slim(ev: any): SlimFixture {
  return {
    id: ev.idEvent,
    name: ev.strEvent,
    round: ev.intRound ?? null,
    date: ev.dateEvent ?? null,
    time: ev.strTime ?? null,
    homeTeam: ev.strHomeTeam ?? null,
    awayTeam: ev.strAwayTeam ?? null,
    homeScore: ev.intHomeScore != null ? Number(ev.intHomeScore) : null,
    awayScore: ev.intAwayScore != null ? Number(ev.intAwayScore) : null,
    status: ev.strStatus ?? null,
    venue: ev.strVenue ?? null,
  };
}

const TEAM_ALIASES: Record<string, string[]> = {
  "united states": ["usa", "united states"],
  "dr congo": ["dr congo", "congo dr", "democratic republic of the congo"],
  "ivory coast": ["ivory coast", "cote d'ivoire", "côte d'ivoire"],
  "south korea": ["south korea", "korea republic", "korea"],
  "czech republic": ["czech republic", "czechia"],
};

function normTeam(name: string | null): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function teamsEquivalent(a: string | null, b: string | null): boolean {
  const na = normTeam(a);
  const nb = normTeam(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  for (const variants of Object.values(TEAM_ALIASES)) {
    if (variants.some((v) => normTeam(v) === na) && variants.some((v) => normTeam(v) === nb)) {
      return true;
    }
  }
  return false;
}

function fixtureKey(date: string | null, home: string | null, away: string | null): string {
  const teams = [normTeam(home), normTeam(away)].sort().join("|");
  return `${date || "?"}|${teams}`;
}

/**
 * Date-agnostic key: just the unordered team pair. Group-stage pairings are
 * unique (each pair meets once), so this safely matches a fixture even when the
 * two data sources disagree on the calendar date (TheSportsDB vs the embedded
 * schedule routinely differ by ±1 day, which used to break the score merge).
 */
function teamPairKey(home: string | null, away: string | null): string {
  return [normTeam(home), normTeam(away)].sort().join("|");
}

function officialToSlim(f: Wc2026GroupFixture): SlimFixture {
  const played = f.homeScore != null && f.awayScore != null;
  return {
    id: f.matchNumber != null ? `wc2026-m${f.matchNumber}` : `wc2026-${f.date}-${normTeam(f.homeTeam)}`,
    name: `${f.homeTeam} vs ${f.awayTeam}`,
    round: String(f.round),
    date: f.date,
    time: null,
    homeTeam: f.homeTeam,
    awayTeam: f.awayTeam,
    homeScore: f.homeScore,
    awayScore: f.awayScore,
    status: played ? "Match Finished" : "Not Started",
    venue: null,
  };
}

function mergeSportsDbIntoOfficial(official: SlimFixture[], sportsDb: SlimFixture[]): SlimFixture[] {
  // Index live data by exact date+teams (fast path) AND by team-pair alone
  // (date-tolerant fallback) so a date discrepancy between sources doesn't drop
  // an otherwise-matching live result.
  const byKey = new Map<string, SlimFixture>();
  const byPair = new Map<string, SlimFixture>();
  for (const f of sportsDb) {
    byKey.set(fixtureKey(f.date, f.homeTeam, f.awayTeam), f);
    byPair.set(teamPairKey(f.homeTeam, f.awayTeam), f);
  }
  return official.map((base) => {
    const live =
      byKey.get(fixtureKey(base.date, base.homeTeam, base.awayTeam)) ??
      byPair.get(teamPairKey(base.homeTeam, base.awayTeam)) ??
      [...byPair.values()].find(
        (f) =>
          (teamsEquivalent(f.homeTeam, base.homeTeam) && teamsEquivalent(f.awayTeam, base.awayTeam)) ||
          (teamsEquivalent(f.homeTeam, base.awayTeam) && teamsEquivalent(f.awayTeam, base.homeTeam))
      );
    if (!live) return base;
    // Only let live scores OVERWRITE the embedded seed when the live source
    // actually has them; never blank out a cached result with a null.
    const liveHasScore = live.homeScore != null && live.awayScore != null;
    return {
      ...base,
      id: live.id || base.id,
      name: live.name || base.name,
      time: live.time ?? base.time,
      homeScore: liveHasScore ? live.homeScore : base.homeScore,
      awayScore: liveHasScore ? live.awayScore : base.awayScore,
      status: liveHasScore ? live.status ?? base.status : base.status,
      venue: live.venue ?? base.venue,
    };
  });
}

function officialGroupFixtures(): SlimFixture[] {
  return WC2026_GROUP_FIXTURES.map(officialToSlim);
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`TheSportsDB ${res.status} ${res.statusText}`);
  return res.json();
}

/** Pull live scores/times from TheSportsDB (best-effort; may be partial on free tier). */
async function fetchSportsDbFixtures(): Promise<SlimFixture[]> {
  const urls = [
    `${base()}/eventsseason.php?id=${leagueId()}&s=${season()}`,
    `${base()}/eventspastleague.php?id=${leagueId()}`,
    `${base()}/eventsnextleague.php?id=${leagueId()}`,
    // Per-round endpoints widen coverage: the league-wide endpoints are capped
    // (~5 events on the free key), but rounds are fetched independently. Group
    // stage is rounds 1–3; 4–7 cover R32→final once the bracket is live.
    ...[1, 2, 3, 4, 5, 6, 7].map(
      (r) => `${base()}/eventsround.php?id=${leagueId()}&r=${r}&s=${season()}`
    ),
  ];
  const seen = new Set<string>();
  const out: SlimFixture[] = [];
  for (const url of urls) {
    try {
      const data = await getJson(url);
      for (const ev of data.events || []) {
        const f = slim(ev);
        const key = f.id || fixtureKey(f.date, f.homeTeam, f.awayTeam);
        if (!seen.has(key)) {
          seen.add(key);
          out.push(f);
        }
      }
    } catch {
      /* ignore per-endpoint failures */
    }
  }
  return out;
}

/**
 * Fetch fixtures. `when`:
 *  - "next": upcoming scheduled matches
 *  - "past": recently played matches
 *  - "all": the whole season's events
 *
 * Group stage uses the embedded official 72-fixture schedule; TheSportsDB enriches scores.
 */
export async function getFixtures(opts: {
  when?: "next" | "past" | "all";
  limit?: number;
  teamContains?: string;
  round?: number;
}): Promise<{ source: string; count: number; fixtures: SlimFixture[]; note?: string }> {
  const when = opts.when || "next";
  const limit = opts.limit ?? 20;

  const sportsDb = await fetchSportsDbFixtures();
  let fixtures = mergeSportsDbIntoOfficial(officialGroupFixtures(), sportsDb);

  if (opts.round != null) {
    fixtures = fixtures.filter((f) => String(f.round) === String(opts.round));
  }

  if (when === "next") {
    fixtures = fixtures.filter((f) => !isFixturePlayed(f));
  } else if (when === "past") {
    fixtures = fixtures.filter((f) => isFixturePlayed(f));
  }

  if (opts.teamContains) {
    const q = opts.teamContains.toLowerCase();
    fixtures = fixtures.filter(
      (f) =>
        (f.homeTeam && f.homeTeam.toLowerCase().includes(q)) ||
        (f.awayTeam && f.awayTeam.toLowerCase().includes(q))
    );
  }

  fixtures.sort((a, b) => {
    const da = `${a.date || ""} ${a.time || ""}`;
    const db = `${b.date || ""} ${b.time || ""}`;
    return da.localeCompare(db);
  });

  const source =
    `official-wc2026-group (${WC2026_GROUP_FIXTURES.length} fixtures)` +
    (sportsDb.length ? ` + TheSportsDB (${sportsDb.length} live)` : "");

  return { source, count: fixtures.length, fixtures: fixtures.slice(0, limit) };
}

const PLAYED_STATUSES = new Set([
  "match finished",
  "finished",
  "ft",
  "aet",
  "pen",
  "full time",
  "game finished",
]);

/** True when the fixture appears completed (status or scores). */
export function isFixturePlayed(f: SlimFixture): boolean {
  if (f.homeScore != null && f.awayScore != null) return true;
  const st = (f.status || "").toLowerCase();
  if (PLAYED_STATUSES.has(st)) return true;
  if (st.includes("finished") || st.includes("full time")) return true;
  if (f.date) {
    // Use the kickoff time when known; otherwise treat the fixture as ending at
    // the close of its match day (+ a buffer). Embedded fixtures carry no time,
    // so without this fallback a clearly-past game stays "Not Started" forever.
    const stamp = f.time ? `${f.date}T${f.time}Z` : `${f.date}T23:59:59Z`;
    const kickoff = new Date(stamp);
    if (!Number.isNaN(kickoff.getTime()) && kickoff.getTime() + 2.5 * 3600_000 < Date.now()) {
      return true;
    }
  }
  return false;
}

/** Fetch the full group-stage fixture list (no limit). */
export async function getAllFixtures(): Promise<SlimFixture[]> {
  const sportsDb = await fetchSportsDbFixtures();
  return mergeSportsDbIntoOfficial(officialGroupFixtures(), sportsDb);
}

/** Group fixtures into matchday buckets by unique date (sorted chronologically). */
export function groupFixturesByMatchday(fixtures: SlimFixture[]): SlimFixture[][] {
  const sorted = [...fixtures].sort((a, b) => {
    const da = `${a.date || ""} ${a.time || ""}`;
    const db = `${b.date || ""} ${b.time || ""}`;
    return da.localeCompare(db);
  });
  const days: string[] = [];
  const byDay = new Map<string, SlimFixture[]>();
  for (const f of sorted) {
    const day = f.date || "unknown";
    if (!byDay.has(day)) {
      byDay.set(day, []);
      days.push(day);
    }
    byDay.get(day)!.push(f);
  }
  return days.map((d) => byDay.get(d)!);
}

/**
 * Return fixtures for a Sport5 fantasy round within a tournament stage.
 * Group stage: roundId 1/2/3 map to matchday buckets (intRound or date clustering).
 */
export function fixturesForFantasyRound(
  roundId: number,
  stage: string,
  allFixtures: SlimFixture[]
): SlimFixture[] {
  if (!allFixtures.length) return [];
  const stageKey = (stage || "group").toLowerCase();

  if (stageKey === "group") {
    const byIntRound = allFixtures.filter((f) => String(f.round) === String(roundId));
    if (byIntRound.length >= 20) return byIntRound;

    const matchdays = groupFixturesByMatchday(allFixtures);
    const groupDays = matchdays.slice(0, 3);
    const idx = Math.max(0, Math.min(roundId - 1, groupDays.length - 1));
    return groupDays[idx] || [];
  }

  // Knockout: one round per stage round id offset from group (round 4+).
  const knockout = allFixtures.filter((f) => {
    const r = f.round != null ? Number(f.round) : NaN;
    return !Number.isNaN(r) && r === roundId;
  });
  if (knockout.length) return knockout;

  const sorted = [...allFixtures].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const knockoutStart = 3;
  const kIdx = Math.max(0, roundId - knockoutStart - 1);
  const chunkSize = stageKey === "r32" ? 16 : stageKey === "r16" ? 8 : stageKey === "qf" ? 4 : stageKey === "sf" ? 2 : 1;
  const start = knockoutStart * 24 + kIdx * chunkSize;
  return sorted.slice(start, start + chunkSize);
}

const HEBREW_WEEKDAYS = ["\u05d0\u05f3", "\u05d1\u05f3", "\u05d2\u05f3", "\u05d3\u05f3", "\u05d4\u05f3", "\u05d5\u05f3", "\u05e9\u05f3"];

/** Format fixture kickoff in Israel time (UTC+3) for display. */
export function formatIsraelTime(date: string | null, time: string | null): {
  dateHe: string;
  timeHe: string;
  iso: string | null;
} {
  if (!date) return { dateHe: "?", timeHe: "?", iso: null };
  const t = time || "00:00:00";
  const utc = new Date(`${date}T${t}Z`);
  if (Number.isNaN(utc.getTime())) {
    return { dateHe: date, timeHe: time || "?", iso: null };
  }
  const israelMs = utc.getTime() + 3 * 3600_000;
  const il = new Date(israelMs);
  const dd = String(il.getUTCDate()).padStart(2, "0");
  const mm = String(il.getUTCMonth() + 1).padStart(2, "0");
  const hh = String(il.getUTCHours()).padStart(2, "0");
  const min = String(il.getUTCMinutes()).padStart(2, "0");
  const wd = HEBREW_WEEKDAYS[il.getUTCDay()];
  return {
    dateHe: `\u05d9\u05d5\u05dd ${wd} ${dd}.${mm}`,
    timeHe: `${hh}:${min}`,
    iso: il.toISOString(),
  };
}
