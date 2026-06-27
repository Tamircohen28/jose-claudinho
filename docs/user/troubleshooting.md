# Troubleshooting

## Private tools fail / "set SPORT5_COOKIE"

**Symptom:** `sport5_get_my_team`, `sport5_get_league_table`, `snapshot_top_teams`
etc. return a message telling you to set `SPORT5_COOKIE`, or the data looks empty.

**Cause:** the cookie is missing or expired. Most Sport5 game data is login-gated and
returns a `302` redirect without a valid session; the tools detect this and ask you
to refresh the cookie.

**Fix:** re-copy the cookie:
1. <https://fantasywc.sport5.co.il> while logged in → DevTools → Network.
2. Click any `dreamteam.sport5.co.il/api/...` request → Headers → copy the full
   **Cookie** value.
3. `export SPORT5_COOKIE='<paste>'` and restart Claude Code (env vars are read at
   launch).

`/fantasy-setup` walks you through this and verifies the connection.

## Which tools even need the cookie?

| Works **without** a cookie | **Requires** `SPORT5_COOKIE` |
|----------------------------|------------------------------|
| `sport5_list_players` | `sport5_get_my_team` |
| `get_game_rules` | `sport5_get_my_leagues` |
| `worldcup_fixtures` | `sport5_get_user_team` |
| `list_snapshots` | `sport5_get_league_table` |
| `analyze_ownership` | `snapshot_top_teams` |
| | `team_round_utilization` |
| | `league_round_utilization` |
| | `league_watchlist` |

## League round utilization fails on a large league

**Symptom:** `league_round_utilization` or `league_watchlist` errors about more than
50 teams.

**Cause:** league-wide tools fetch every squad in the league (one API call per team).
They are capped at 50 teams to stay polite to Sport5.

**Fix:** pass a **private league** name or `leagueId` (e.g. `/league-watchlist כצים`),
not the overall Sport5 league.

## The plugin doesn't appear / MCP server won't start

- **Did you build the bundle?** `mcp-server/dist/index.js` must exist. Run
  `cd mcp-server && npm run build`.
- **Node missing?** The server runs under `node`; confirm `node --version` works.
- **Wrong path in the marketplace add?** Re-run `/plugin marketplace add` with the
  absolute path to *your* clone.

## `npm install` hangs or hits an unexpected registry

This project pins the public npm registry via `mcp-server/.npmrc`
(`registry=https://registry.npmjs.org/`). If installs still stall, try
`npm install --prefer-offline`, or clear the npm cache. Don't launch competing
parallel installs.

## Build fails with a shebang / syntax error

The esbuild bundle preserves the shebang from the entry file; the build config must
**not** add a second one. If you edited `esbuild.config.mjs`, make sure the banner
contains only the `createRequire` shim, not a `#!/usr/bin/env node` line.

## `analyze_ownership` says there are no snapshots

You need to snapshot first. Run `/snapshot-league` (which calls `snapshot_top_teams`)
at least once; ownership analysis is built from stored snapshots in
`~/.fantasy-wc-mcp/data/` (or `FWC_DATA_DIR`).

## Running multiple hosts or agents at once

Claude Code, Cursor, and Codex each spawn an independent MCP process — they do not share
stdio or a port. Snapshots default to a shared data dir so all hosts benefit from the same
history.

- **Cookie out of sync** — restart the host after updating `.env` or `SPORT5_COOKIE`.
- **Heavy parallel fetches** — stagger `/snapshot-league` and league-wide tools across agents.
- **Separate accounts or experiments** — set a different `FWC_DATA_DIR` per host.

See [multi-host.md](multi-host.md).

## Fixtures look empty

`worldcup_fixtures` falls back to the full season list when TheSportsDB's "next"
window is empty. If it's still blank, the free API may be rate-limited — retry, or set
`SPORTSDB_KEY` to a paid key.
