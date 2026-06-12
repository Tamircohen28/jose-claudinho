/**
 * World Cup 2026 fixtures via TheSportsDB (free, no key required — default key "3").
 *
 * Note: TheSportsDB team naming will not map cleanly to the game's Hebrew
 * national-team names, so this is a loosely-matched schedule view, not joined
 * to player records.
 */

function key(): string {
  return process.env.SPORTSDB_KEY || "3";
}

function leagueId(): string {
  // FIFA World Cup league id on TheSportsDB.
  return process.env.SPORTSDB_WC_LEAGUE_ID || "4429";
}

function season(): string {
  return process.env.SPORTSDB_WC_SEASON || "2026";
}

function base(): string {
  return `https://www.thesportsdb.com/api/v1/json/${key()}`;
}

interface SlimFixture {
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
