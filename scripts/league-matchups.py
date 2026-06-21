#!/usr/bin/env python3
"""
league-matchups.py — הכצים fantasy league player ownership per WC game.

Usage:
    SPORT5_COOKIE="..." python scripts/league-matchups.py [DATE] [--matches "MATCH_LIST"]

    DATE        — YYYY-MM-DD in US Eastern time. Default: today (EDT, UTC-4).
    --matches   — Comma-separated game list. Each item:
                    "[HH:MM] Team A vs Team B"   (HH:MM = Israel time, optional)
                  Example:
                    --matches "20:00 Spain vs Saudi Arabia, 23:00 Belgium vs Iran, 02:00 Uruguay vs Cape Verde"
                  If omitted, the script tries TheSportsDB (limited free data).

Kickoff times in output are always in Israel time (UTC+3).
"""

import sys
import os
import re
import json
import argparse
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
import concurrent.futures

# ── Constants ──────────────────────────────────────────────────────────────────

SPORT5_BASE         = "https://dreamteam.sport5.co.il/api"
SEASON_ID           = 9
SPORTSDB_BASE       = "https://www.thesportsdb.com/api/v1/json/3"
SPORTSDB_WC_ID      = "4429"
SPORTSDB_WC_SEASON  = "2026"

US_EASTERN = timezone(timedelta(hours=-4))   # EDT (summer)
ISRAEL_TZ  = timezone(timedelta(hours=+3))   # IST

LEAGUE_TEAMS = [
    {"userId": 224372, "teamName": "קספרגנטינה"},
    {"userId": 232837, "teamName": "אפרוחי באר שבע"},
    {"userId": 232935, "teamName": "מ.ס. בונגוס"},
    {"userId": 232953, "teamName": "שלונג סיטי"},
    {"userId": 233096, "teamName": "AC unit"},
    {"userId": 233103, "teamName": "Yanukiz"},
    {"userId": 234540, "teamName": "הלגיונרים"},
    {"userId": 235287, "teamName": "הדבורים"},
    {"userId": 240079, "teamName": "Abale F.C"},
    {"userId": 240272, "teamName": "F.C.R.B.E"},
    {"userId": 242279, "teamName": "Maccabi skud"},
    {"userId": 242335, "teamName": "Fureidis F.C"},
]

# Hebrew Sport5 name (as returned by the market API) → English name(s).
# Keys verified against the live market on 2026-06-21.
HEBREW_TO_ENGLISH: dict[str, list[str]] = {
    "ארגנטינה":                       ["Argentina"],
    "ברזיל":                          ["Brazil"],
    "צרפת":                           ["France"],
    "אנגליה":                         ["England"],
    "ספרד":                           ["Spain"],
    "גרמניה":                         ["Germany"],
    "פורטוגל":                        ["Portugal"],
    "הולנד":                          ["Netherlands", "Holland"],
    "בלגיה":                          ["Belgium"],
    "איטליה":                         ["Italy"],
    "קרואטיה":                        ["Croatia"],
    "אורוגוואי":                      ["Uruguay"],
    "קולומביה":                       ["Colombia"],
    "מקסיקו":                         ["Mexico"],
    "קנדה":                           ["Canada"],
    "מרוקו":                          ["Morocco"],
    "יפן":                            ["Japan"],
    "דרום קוריאה":                    ["South Korea", "Korea Republic"],
    "אוסטרליה":                       ["Australia"],
    "שווייץ":                         ["Switzerland"],
    "דנמרק":                          ["Denmark"],
    "שוודיה":                         ["Sweden"],
    "פולין":                          ["Poland"],
    "סנגל":                           ["Senegal"],
    "מצרים":                          ["Egypt"],
    "אלג'יריה":                       ["Algeria"],
    "תוניסיה":                        ["Tunisia"],
    "ערב הסעודית":                    ["Saudi Arabia"],
    "איראן":                          ["Iran"],
    "עיראק":                          ["Iraq"],
    "אוסטריה":                        ["Austria"],
    "נורווגיה":                       ["Norway"],
    "אקוואדור":                       ["Ecuador"],
    "חוף השנהב":                      ["Ivory Coast", "Cote d'Ivoire"],
    "כף ורדה":                        ["Cape Verde"],
    "אוזבקיסטן":                      ["Uzbekistan"],
    "ניו זילנד":                      ["New Zealand"],
    "ירדן":                           ["Jordan"],
    "הרפובליקה הדמוקרטית של קונגו":   ["Congo DR", "DR Congo"],
    "סקוטלנד":                        ["Scotland"],
    "צ'כיה":                          ["Czech Republic", "Czechia"],
    "רומניה":                         ["Romania"],
    "אוקראינה":                       ["Ukraine"],
    "קוסטה ריקה":                     ["Costa Rica"],
    "פרגוואי":                        ["Paraguay"],
    "צ'ילי":                          ["Chile"],
    "פרו":                            ["Peru"],
    "ונצואלה":                        ["Venezuela"],
    'ארה"ב':                          ["United States", "USA"],
    "ארצות הברית":                    ["United States", "USA"],
    "טורקיה":                         ["Turkey", "Turkiye"],
    "סרביה":                          ["Serbia"],
    "יוון":                           ["Greece"],
    "הונגריה":                        ["Hungary"],
    "סלובניה":                        ["Slovenia"],
    "סלובאקיה":                       ["Slovakia"],
    "קמרון":                          ["Cameroon"],
    "גאנה":                           ["Ghana"],
    "ניגריה":                         ["Nigeria"],
    "אתיופיה":                        ["Ethiopia"],
    "קטאר":                           ["Qatar"],
    "פנמה":                           ["Panama"],
    "סין":                            ["China", "China PR"],
    "דרום אפריקה":                    ["South Africa"],
    "בוסניה והרצגובינה":              ["Bosnia and Herzegovina", "Bosnia", "Bosnia-Herzegovina"],
    "מקדוניה":                        ["North Macedonia", "Macedonia"],
    "בלגריה":                         ["Bulgaria"],
    "אלבניה":                         ["Albania"],
    "האיטי":                          ["Haiti"],
    "קורוסאו":                        ["Curacao", "Curaçao"],
}

# ── Helpers ────────────────────────────────────────────────────────────────────

def _normalize_he(s: str) -> str:
    """Normalise Hebrew geresh/gershayim to ASCII equivalents."""
    return s.strip().replace("׳", "'").replace("״", '"')


def _fetch_json(url: str, cookie: str | None = None) -> dict | list:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    if cookie:
        req.add_header("Cookie", cookie)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _utc_to_tz(date_str: str, time_str: str, tz: timezone) -> datetime | None:
    t = (time_str or "00:00:00").replace("+00:00", "").strip()
    try:
        utc = datetime.strptime(f"{date_str}T{t}", "%Y-%m-%dT%H:%M:%S").replace(
            tzinfo=timezone.utc
        )
        return utc.astimezone(tz)
    except Exception:
        return None


# ── Manual match parser ────────────────────────────────────────────────────────

_TIME_RE = re.compile(r"^(\d{1,2}:\d{2})\s+(.+)$")
_VS_RE   = re.compile(r"\s+vs\.?\s+", re.IGNORECASE)

def parse_matches(raw: str) -> list[dict]:
    """
    Parse --matches string into fixture dicts.
    Accepts:  "20:00 Spain vs Saudi Arabia, 23:00 Belgium vs Iran"
    or simply: "Spain vs Saudi Arabia, Belgium vs Iran"
    """
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    result = []
    for part in parts:
        m = _TIME_RE.match(part)
        if m:
            il_time, rest = m.group(1), m.group(2).strip()
        else:
            il_time, rest = "??:??", part
        sides = _VS_RE.split(rest, maxsplit=1)
        if len(sides) != 2:
            print(f"[warn] Could not parse match '{part}', skipping.", file=sys.stderr)
            continue
        result.append({
            "home":     sides[0].strip(),
            "away":     sides[1].strip(),
            "il_time":  il_time,
            "sort_key": _time_to_sort(il_time),
        })
    result.sort(key=lambda x: x["sort_key"])
    return result


def _time_to_sort(il_time: str) -> float:
    """Sort key for Israel times crossing midnight (00-06 sort after 20-23)."""
    if il_time == "??:??":
        return 99.0
    h, m = map(int, il_time.split(":"))
    # Times 00-09 are late night → sort after 20+
    return h + (24 if h < 10 else 0) + m / 60


# ── TheSportsDB fixtures (auto-detect fallback) ────────────────────────────────

def get_fixtures_from_sportsdb(target_date: str) -> list[dict]:
    """
    Try TheSportsDB for fixtures on target_date (US Eastern).
    Returns empty list on failure or when data unavailable.
    """
    events: list[dict] = []
    for url in [
        f"{SPORTSDB_BASE}/eventsseason.php?id={SPORTSDB_WC_ID}&s={SPORTSDB_WC_SEASON}",
        f"{SPORTSDB_BASE}/eventsnextleague.php?id={SPORTSDB_WC_ID}",
        f"{SPORTSDB_BASE}/eventsday.php?d={target_date}&l=FIFA%20World%20Cup",
    ]:
        try:
            data = _fetch_json(url)
            evs = (data.get("events") or []) if isinstance(data, dict) else []
            events.extend(evs)
        except Exception:
            pass

    # Deduplicate by event id
    seen: set[str] = set()
    unique = []
    for ev in events:
        eid = ev.get("idEvent", "")
        if eid not in seen:
            seen.add(eid)
            unique.append(ev)

    result = []
    for ev in unique:
        date_str = ev.get("dateEvent", "")
        time_str = ev.get("strTime") or "00:00:00"
        if not date_str:
            continue
        et_dt = _utc_to_tz(date_str, time_str, US_EASTERN)
        if not et_dt or et_dt.strftime("%Y-%m-%d") != target_date:
            continue
        il_dt = _utc_to_tz(date_str, time_str, ISRAEL_TZ)
        il_time = il_dt.strftime("%H:%M") if il_dt else "??:??"
        result.append({
            "home":     ev.get("strHomeTeam") or "",
            "away":     ev.get("strAwayTeam") or "",
            "il_time":  il_time,
            "sort_key": _time_to_sort(il_time),
        })

    result.sort(key=lambda x: x["sort_key"])
    return result


# ── Sport5 data ────────────────────────────────────────────────────────────────

def _fetch_market() -> list:
    resp = _fetch_json(f"{SPORT5_BASE}/Players/GetTeamsAndPlayers?seasonId={SEASON_ID}")
    return (resp.get("data") or []) if isinstance(resp, dict) else []


def _fetch_squad(user_id: int, cookie: str) -> dict:
    resp = _fetch_json(
        f"{SPORT5_BASE}/UserTeam/GetUserAndTeam?seasonId={SEASON_ID}&userId={user_id}",
        cookie,
    )
    return resp if isinstance(resp, dict) else {}


def build_nation_player_map(market: list) -> dict[int, dict[int, str]]:
    """nationId → {playerId → playerName}"""
    result: dict[int, dict[int, str]] = {}
    for group in market:
        nid = group.get("id")
        if nid is None:
            continue
        pm: dict[int, str] = {}
        for p in group.get("players") or []:
            pm[int(p["id"])] = p["name"].strip()
        result[int(nid)] = pm
    return result


def build_english_to_nation_id(market: list) -> dict[str, int]:
    """lowercase English name → Sport5 nationId"""
    en_to_id: dict[str, int] = {}
    for group in market:
        nid = group.get("id")
        name_he_raw = (group.get("name") or "").strip()
        if nid is None or not name_he_raw:
            continue
        name_he = _normalize_he(name_he_raw)
        en_names = HEBREW_TO_ENGLISH.get(name_he)
        if not en_names:
            for key, val in HEBREW_TO_ENGLISH.items():
                if key in name_he or name_he in key:
                    en_names = val
                    break
        if en_names:
            for en in en_names:
                en_to_id[en.lower()] = int(nid)
    return en_to_id


def build_owner_map(squads: list[dict]) -> dict[int, list[str]]:
    """playerId → [fantasyTeamName], active players only."""
    owner_map: dict[int, list[str]] = {}
    for i, squad in enumerate(squads):
        ft = LEAGUE_TEAMS[i]["teamName"]
        players = (
            ((squad.get("data") or {}).get("userTeam") or {}).get("userTeamPlayers") or []
        )
        for p in players:
            if p.get("isRemoved") or p.get("isActive") is False:
                continue
            pid = int(p["playerId"])
            owner_map.setdefault(pid, []).append(ft)
    return owner_map


# ── Output ─────────────────────────────────────────────────────────────────────

def print_fixture(fix: dict, nation_player_map: dict, en_to_id: dict, owner_map: dict) -> None:
    home, away = fix["home"], fix["away"]
    il_time    = fix["il_time"]

    home_id = en_to_id.get(home.lower())
    away_id = en_to_id.get(away.lower())

    home_pm = nation_player_map.get(home_id, {}) if home_id else {}
    away_pm = nation_player_map.get(away_id, {}) if away_id else {}

    home_lines = [
        f"{pname} - {ft}"
        for pid, pname in home_pm.items()
        for ft in owner_map.get(pid, [])
    ]
    away_lines = [
        f"{pname} - {ft}"
        for pid, pname in away_pm.items()
        for ft in owner_map.get(pid, [])
    ]

    if not home_id:
        print(f"[warn] '{home}' not matched to any Sport5 nation (check spelling)", file=sys.stderr)
    if not away_id:
        print(f"[warn] '{away}' not matched to any Sport5 nation (check spelling)", file=sys.stderr)

    print(f"[{il_time}] {home} vs {away}:")
    print(f"For {home} plays:")
    for line in home_lines or ["(no players owned in the league)"]:
        print(line)
    print(f"For {away} plays:")
    for line in away_lines or ["(no players owned in the league)"]:
        print(line)
    print()


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Show הכצים league player ownership per WC game on a given US date.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Today's games (auto-detect from TheSportsDB — limited free data):
  SPORT5_COOKIE="..." python scripts/league-matchups.py

  # Specific date, games manually specified (times in Israel time):
  SPORT5_COOKIE="..." python scripts/league-matchups.py 2026-06-21 \\
    --matches "20:00 Spain vs Saudi Arabia, 23:00 Belgium vs Iran, 02:00 Uruguay vs Cape Verde, 05:00 New Zealand vs Egypt"

  # Just team names, no times:
  SPORT5_COOKIE="..." python scripts/league-matchups.py \\
    --matches "France vs Germany, Brazil vs Argentina"
""",
    )
    parser.add_argument("date", nargs="?", help="YYYY-MM-DD in US Eastern (default: today)")
    parser.add_argument("--matches", "-m", help="Comma-separated match list (see examples)")
    args = parser.parse_args()

    cookie = os.environ.get("SPORT5_COOKIE", "")
    if not cookie:
        parser.error(
            "SPORT5_COOKIE is not set.\n"
            "  export SPORT5_COOKIE='<paste your browser cookie here>'\n"
            "  Then re-run the script."
        )

    target_date = args.date or datetime.now(US_EASTERN).strftime("%Y-%m-%d")

    # Resolve fixtures
    if args.matches:
        fixtures = parse_matches(args.matches)
        if not fixtures:
            sys.exit("No valid matches parsed from --matches.")
    else:
        print(f"Fetching WC fixtures for {target_date} from TheSportsDB…", file=sys.stderr)
        fixtures = get_fixtures_from_sportsdb(target_date)
        if not fixtures:
            print(
                f"\nNo fixtures found for {target_date} via TheSportsDB (free tier is limited).\n"
                "Specify matches manually:\n"
                f'  python scripts/league-matchups.py {target_date} \\\n'
                '    --matches "20:00 Team A vs Team B, 23:00 Team C vs Team D"\n',
                file=sys.stderr,
            )
            sys.exit(1)

    print(f"Fetching {len(LEAGUE_TEAMS)} squads + market in parallel…", file=sys.stderr)

    # Fetch market + all squads in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=13) as pool:
        market_future  = pool.submit(_fetch_market)
        squad_futures  = [pool.submit(_fetch_squad, t["userId"], cookie) for t in LEAGUE_TEAMS]
        market = market_future.result()
        squads = [f.result() for f in squad_futures]

    nation_player_map = build_nation_player_map(market)
    en_to_id          = build_english_to_nation_id(market)
    owner_map         = build_owner_map(squads)

    print()  # blank line before results
    for fix in fixtures:
        print_fixture(fix, nation_player_map, en_to_id, owner_map)


if __name__ == "__main__":
    main()
