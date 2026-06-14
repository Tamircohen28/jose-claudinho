/**
 * World Cup 2026 fixtures via TheSportsDB (free, no key required — default key "3").
 *
 * Note: TheSportsDB team naming will not map cleanly to the game's Hebrew
 * national-team names, so this is a loosely-matched schedule view, not joined
 * to player records.
 */

import { envOr } from "./env.js";

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

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`TheSportsDB ${res.status} ${res.statusText}`);
  return res.json();
}

/**
 * Fetch fixtures. `when`:
 *  - "next": upcoming scheduled matches
 *  - "past": recently played matches
 *  - "all": the whole season's events
 */
export async function getFixtures(opts: {
  when?: "next" | "past" | "all";
  limit?: number;
  teamContains?: string;
}): Promise<{ source: string; count: number; fixtures: SlimFixture[]; note?: string }> {
  const when = opts.when || "next";
  const limit = opts.limit ?? 20;

  let url: string;
  if (when === "next") url = `${base()}/eventsnextleague.php?id=${leagueId()}`;
  else if (when === "past") url = `${base()}/eventspastleague.php?id=${leagueId()}`;
  else url = `${base()}/eventsseason.php?id=${leagueId()}&s=${season()}`;

  let data: any;
  try {
    data = await getJson(url);
  } catch (e: any) {
    return {
      source: url,
      count: 0,
      fixtures: [],
      note: `TheSportsDB request failed: ${e?.message || e}`,
    };
  }

  let events: any[] = data.events || [];
  if (!events.length && when === "next") {
    // Free-tier next/past endpoints can be empty before the tournament has
    // upcoming data; fall back to the full season list.
    try {
      const seasonData = await getJson(`${base()}/eventsseason.php?id=${leagueId()}&s=${season()}`);
      events = seasonData.events || [];
    } catch {
      /* ignore */
    }
  }

  let fixtures = events.map(slim);

  if (opts.teamContains) {
    const q = opts.teamContains.toLowerCase();
    fixtures = fixtures.filter(
      (f) =>
        (f.homeTeam && f.homeTeam.toLowerCase().includes(q)) ||
        (f.awayTeam && f.awayTeam.toLowerCase().includes(q))
    );
  }

  // Sort by date when available.
  fixtures.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const note = fixtures.length
    ? undefined
    : `No fixtures returned for World Cup league ${leagueId()} season ${season()}. ` +
      `The free data source may not have 2026 fixtures populated yet.`;

  return { source: url, count: fixtures.length, fixtures: fixtures.slice(0, limit), note };
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
  if (f.date && f.time) {
    const kickoff = new Date(`${f.date}T${f.time}Z`);
    if (!Number.isNaN(kickoff.getTime()) && kickoff.getTime() + 2.5 * 3600_000 < Date.now()) {
      return true;
    }
  }
  return false;
}

/** Fetch the full season fixture list (no limit). */
export async function getAllFixtures(): Promise<SlimFixture[]> {
  const res = await getFixtures({ when: "all", limit: 500 });
  return res.fixtures;
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
    if (byIntRound.length >= 8) return byIntRound;

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
