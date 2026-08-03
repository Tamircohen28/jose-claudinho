<p align="center">
  <img src="assets/banner.svg" alt="José Claudinho" width="640">
</p>

# José Claudinho ⚽🤖

[![CI](https://github.com/TamirCohen28/jose-claudinho/actions/workflows/ci.yml/badge.svg)](https://github.com/TamirCohen28/jose-claudinho/actions/workflows/ci.yml)
[![Tamir Cohen](https://img.shields.io/badge/author-Tamir%20Cohen-181717?logo=github)](https://github.com/TamirCohen28)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![version](https://img.shields.io/badge/version-1.5.0-blue)](CHANGELOG.md)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-2.1.220-blueviolet)](https://code.claude.com/docs/en/plugins-reference)
[![Cursor](https://img.shields.io/badge/Cursor-3.14.7-000000)](https://cursor.com/docs/plugins)
[![Codex](https://img.shields.io/badge/Codex-0.146.0-412991)](https://developers.openai.com/codex/guides/agents-md)
[![OpenCode](https://img.shields.io/badge/OpenCode-1.18.11-fab283)](https://opencode.ai/docs/skills/)

> Your AI assistant manager for **Sport5 Fantasy World Cup 2026**.

José Claudinho is a **multi-host plugin** for the four targets this repo supports —
[Claude Code](https://claude.com/claude-code), [Cursor](https://cursor.com),
[Codex](https://developers.openai.com/codex/plugins/), and [OpenCode](https://opencode.ai) — that
bundles an MCP server + skills + slash commands. It reads the player market, your
team, your rivals' top teams, the league tables and the World Cup fixtures, learns
from weekly snapshots of the best teams, and recommends the transfers, captain and
lineup that maximize your score **under the official game rules**.

It is **read-and-recommend only** — it never makes changes to your team. It hands
you a concrete plan; you apply it in the app.

---

## What it does

- **Knows the rules cold.** Squad shape, per-stage budgets (120M → 135M), the
  max-players-per-nation cap (2 → 9), transfer counts, the full scoring table, and
  the four bonus chips are encoded from the official terms and exposed via
  `get_game_rules`.
- **Reads the live game.** Your team, any user's team, the market (1000+ players),
  your league standings, and any league table — all via the Sport5 API.
- **Learns over time.** `snapshot_top_teams` captures the top-N teams' squads +
  the market into local JSON each round; `analyze_ownership` turns that history
  into most-owned players, popular captains, best value, and differentials.
- **Recommends.** The `squad-advice` skill runs a 10-step procedure and
  validates every plan against a hard constraint checklist before presenting it.
- **Tracks round progress.** Round-utilization tools join your squad (or a whole
  private league) to World Cup fixtures — who has already played this round vs who is
  still waiting, and which upcoming matches matter for your league.
- **Optimises combinatorially.** `optimize_squad` runs a Mixed Integer Linear Program (HiGHS
  WASM) to jointly pick the best squad, XI, bench, and captain under every constraint at once
  — budget, formation, nation cap, transfer limit. `compute_league_win` overlays your league
  position to recommend whether to play conservatively (protect a lead) or aggressively
  (maximise ceiling to close a gap).

## Components

| Type | Name | Purpose |
|------|------|---------|
| MCP server | `fantasy-wc` | 21 tools over the Sport5 API + TheSportsDB fixtures + local snapshots |
| Skill | `squad-advice` | Produce this round's transfer/captain/lineup plan (`/squad-advice`) |
| Skill | `squad-debate` | Three strategy agents debate, then synthesise a verdict (`/squad-debate`) |
| Skill | `transfer-optimizer` | EV-grounded transfer & lineup optimizer (`/transfer-optimizer`) |
| Skill | `snapshot-league` | Capture top teams + market for learning (`/snapshot-league`) |
| Skill | `fantasy-setup` | Configure your session cookie and verify the connection (`/fantasy-setup`) |
| Skill | `team-round-utilization` | One team's players: fixture, played/upcoming, points (`/team-round-utilization`) |
| Skill | `league-round-utilization` | League table: how many players played this round (`/league-round-utilization`) |
| Skill | `league-watchlist` | Games of interest for a private league (`/league-watchlist`) |
| Skill | `league-round-report` | Full league round report — recommended default (`/league-round-report`) |
| Skill | `league-next24h-matchups` | WC matches in the next 24h with league ownership (`/league-next24h-matchups`) |
| MCP tool | `optimize_squad` | MILP squad optimizer — best squad/XI/bench/captain under all constraints |
| MCP tool | `compute_league_win` | League-win probability + adaptive strategy mode (conservative/balanced/aggressive) |

### MCP tools

`sport5_list_players` · `sport5_get_my_team` · `sport5_get_user_team` ·
`sport5_get_my_leagues` · `sport5_get_league_table` · `worldcup_fixtures` ·
`snapshot_top_teams` · `analyze_ownership` · `list_snapshots` · `get_game_rules` ·
`compute_squad_ev` · `rank_transfer_candidates` · `team_round_utilization` ·
`league_round_utilization` · `league_watchlist` · `predict_bracket_matchups` ·
`get_lineup_predictions` · `get_player_availability` · `optimize_squad` · `compute_league_win`

## Prerequisites

- **An AI host** — one of the four supported targets:
  [Claude Code](https://claude.com/claude-code) ≥ 2.0.0, [Cursor](https://cursor.com) ≥ 3.14.7,
  [Codex](https://developers.openai.com/codex/plugins/) ≥ 0.40.0, or
  [OpenCode](https://opencode.ai) ≥ 1.16.2. Validated versions and the evidence behind each
  floor: [platform-targets.json](docs/engineering/build-and-release/platform-targets.json).
- **Node.js ≥ 18** (developed on 22) — to build the MCP bundle. The runtime bundle is committed, so end-users only need Node to *run* it, not to install dependencies.
- **A Sport5 Fantasy WC 2026 account** — for the private (team/league) reads. The player market, rules and fixtures work without one.

## Quick Start

This repo **is** the plugin, and it is its own marketplace on every target that has one — no
catalog required. Pick your host; the [install index](docs/user/install/README.md) has the full
per-target guides.

### Claude Code

```bash
make install   # first time: MCP deps
make plugin    # build bundle + install marketplace plugin
```

Or straight from GitHub, without cloning:

```text
/plugin marketplace add TamirCohen28/jose-claudinho
/plugin install jose-claudinho@jose-claudinho
```

Docs: [Claude Code install guide](docs/user/install/claude-code.md)

### Cursor

```bash
make install        # first time: MCP deps
make cursor-plugin  # symlink into ~/.cursor/plugins/local
```

Docs: [Cursor install guide](docs/user/install/cursor.md)

### Codex

```bash
make install       # first time: MCP deps
make codex-plugin  # register marketplace with Codex CLI
```

Or straight from GitHub:

```bash
codex plugin marketplace add TamirCohen28/jose-claudinho
codex plugin add jose-claudinho@jose-claudinho
```

Docs: [Codex install guide](docs/user/install/codex.md)

### OpenCode

OpenCode has no plugin marketplace — it reads skills from disk:

```bash
git clone https://github.com/TamirCohen28/jose-claudinho.git
cd jose-claudinho && make install && cd mcp-server && npm run build
ln -s "$PWD/../skills" ~/.config/opencode/skill
```

Then declare the `fantasy-wc` MCP server in `~/.config/opencode/opencode.json` —
`.mcp.json` is not read on this target.

Docs: [OpenCode install guide](docs/user/install/opencode.md)

Restart your AI host after install to load the latest build.

<details>
<summary>Alternative (manual) — Claude Code marketplace commands from a local clone</summary>

```bash
# 1. Build the self-contained MCP bundle (one time, and after server changes)
cd mcp-server
npm install
npm run build      # produces mcp-server/dist/index.js
cd ..

# 2. Add as a local plugin marketplace, then install
#    (from an interactive `claude` session)
/plugin marketplace add /path/to/jose-claudinho
/plugin install jose-claudinho@jose-claudinho
```
</details>

The committed `mcp-server/dist/index.js` is a single self-contained file, so the
plugin runs without `node_modules` present at runtime. Rebuild only when you change
the server source.

## Update

After `git pull`:

```bash
make update
make plugin          # Claude Code
# or make cursor-plugin / make codex-plugin for your host
```

## Uninstall

```bash
make uninstall       # removes local Cursor symlink + build artifacts
```

For Claude Code, remove the plugin from `/plugin` settings if you no longer need it.

## Configure

**The only thing you ever set is your session cookie.** Fixtures, snapshot storage,
season and league ids all ship with working defaults baked into the server — no setup
required. (Unset or unsubstituted `${VAR}` placeholders are ignored, so the defaults
always win.)

Private endpoints (your team, your leagues) use your logged-in Sport5 session. Set
your cookie as an environment variable before launching Claude Code:

```bash
export SPORT5_COOKIE='<paste the Cookie request header from DevTools>'
```

How to get it: open <https://fantasywc.sport5.co.il> while logged in → DevTools →
Network → click any `dreamteam.sport5.co.il/api/...` request → Headers → copy the
full **Cookie** value. The cookie expires periodically; re-copy it if private tools
start failing. Run `/fantasy-setup` for a guided walkthrough.

| Env var | Default | Set it? | Purpose |
|---------|---------|---------|---------|
| `SPORT5_COOKIE` | — | **Yes**, for private reads | Your session cookie |
| `SPORT5_SEASON_ID` | `9` | No | Season id |
| `FWC_DATA_DIR` | `~/.fantasy-wc-mcp/data` | No | Where snapshots are stored |

Running Claude Code, Cursor, and Codex together? See
[docs/user/multi-host.md](docs/user/multi-host.md) — MCP is isolated per session; only
snapshots, caches, and API load are shared.
| `SPORTSDB_KEY` | `3` | No | TheSportsDB API key (free default) |
| `SPORTSDB_WC_LEAGUE_ID` | `4429` | No | TheSportsDB World Cup league id |
| `SPORTSDB_WC_SEASON` | `2026` | No | Fixtures season |

Everything marked "No" is optional — override it only if you have a reason to.

### What needs the cookie

The Sport5 game data is mostly **login-gated** — endpoints return a `302` redirect
to the login page without a valid session.

| Works **without** a cookie | **Requires** `SPORT5_COOKIE` |
|----------------------------|------------------------------|
| `sport5_list_players` (market) | `sport5_get_my_team` |
| `get_game_rules` (config) | `sport5_get_my_leagues` |
| `worldcup_fixtures` (TheSportsDB) | `sport5_get_user_team` (any user) |
| `list_snapshots` (local) | `sport5_get_league_table` |
| `analyze_ownership` (local) | `snapshot_top_teams` |
| | `team_round_utilization` |
| | `league_round_utilization` |
| | `league_watchlist` |

So the player market, the rules and the fixtures are public, but **anything about
teams, leagues or standings — including the weekly snapshot/learning feature —
needs your session cookie.** It's a single paste (no OAuth); cookie-gated tools
return a clear "set SPORT5_COOKIE" message if it's missing or expired.

## Usage

```text
/fantasy-setup                    # first time: configure and verify connection
/snapshot-league                  # capture this round's top teams (do this weekly)
/squad-advice qf                  # full 10-step plan for the quarter-final round
/squad-debate                     # three AI managers debate, then synthesise a verdict
/transfer-optimizer               # standalone EV-grounded transfer analysis
/team-round-utilization           # your squad: who played vs still waiting
/league-round-report כצים         # full league report — recommended default
/league-round-utilization כצים    # league: played/upcoming counts per team
/league-watchlist כצים            # upcoming fixtures of interest for your league
/league-next24h-matchups          # WC matches in the next 24 h with league ownership
```

Skills are user-invoked only (`disable-model-invocation: true`) — run the slash command
to trigger; they do not auto-fire from a plain message.

The underlying MCP tools (`optimize_squad`, `compute_league_win`, `compute_squad_ev`, etc.)
are called automatically by the skills. Advanced users can call them directly via the MCP
interface for custom analysis.

## How it works

```
You ──▶ /squad-advice ──▶ squad-advice skill
                              │
                              ├─ get_game_rules(stage)               → budget, caps, transfers
                              ├─ sport5_get_my_team                  → your XI/bench/captain/budget
                              ├─ worldcup_fixtures                   → who plays, eliminations
                              ├─ predict_bracket_matchups (MC×500)   → per-team stage probabilities
                              ├─ get_lineup_predictions              → confirmed/probable starters
                              ├─ get_player_availability             → injuries & suspensions
                              ├─ compute_squad_ev                   → per-player expected value
                              ├─ snapshot_top_teams + analyze_ownership → ownership & differentials
                              ├─ rank_transfer_candidates            → shortlist by EV gain
                              ├─ optimize_squad (MILP)               → optimal squad/XI/bench/captain
                              ├─ compute_league_win                  → league strategy mode
                              └─ validate vs constraint checklist    → legal plan
                              ▼
                       Concrete plan (transfers, captain, XI, bench, chips, strategy mode)
```

## Development

```bash
cd mcp-server
npm run typecheck    # tsc --noEmit
npm run build        # esbuild → dist/index.js
```

The MCP source is in `mcp-server/src/` (`rules.ts`, `transform.ts`,
`sport5Client.ts`, `fixtures.ts`, `nations.ts`, `roundUtilization.ts`,
`storage.ts`, `analysis.ts`, `index.ts`). The game rules live entirely in
`rules.ts` — update there if Sport5 changes them.

## Documentation

Full docs live in [`docs/`](docs/):

- **[User guide](docs/user/)** — [concepts](docs/user/concepts.md), [quick start](docs/user/quick-start.md), [troubleshooting](docs/user/troubleshooting.md).
- **[Engineering](docs/engineering/)** — [architecture overview](docs/engineering/architecture/overview.md), [development workflow](docs/engineering/build-and-release/development-workflow.md), [decision records](docs/engineering/decisions/).
- **[Changelog](CHANGELOG.md)** · **[Contributing](docs/CONTRIBUTING.md)**

## Contributing

Issues and PRs are welcome. See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for the
workflow, code style and the constraint that this tool stays **read-and-recommend only**.

## Disclaimer

Unofficial, personal, non-commercial fan project. Not affiliated with or endorsed
by Sport5 / ערוץ הספורט. It only reads the public/your-own game data through your
own session and gives advice; it makes no changes. Use within the game's terms.

## License

MIT © [TamirCohen28](https://github.com/TamirCohen28)
