# Quick Start

Zero to your first recommendation in about five minutes.

## 1. Prerequisites

- [Claude Code](https://claude.com/claude-code) installed.
- [Node.js ≥ 18](https://nodejs.org) (only needed to build the bundle once).
- A Sport5 Fantasy WC 2026 account (for team/league reads).

## 2. Build the MCP bundle

```bash
cd mcp-server
npm install
npm run build      # produces mcp-server/dist/index.js
cd ..
```

The bundle is a single self-contained file, so once built it runs without
`node_modules`.

## 3. Install the plugin

From the repo root (recommended):

```bash
make plugin
```

Then restart Claude Code (or run `/plugin`).

Or manually from an interactive `claude` session:

```text
/plugin marketplace add /Users/tamircohen/Projects/jose-claudinho
/plugin install jose-claudinho@jose-claudinho
```

(Adjust the path to wherever you cloned the repo.)

To **update** after pulling new changes: run `make plugin` again and restart Claude Code.

## 4. Give it your session cookie

Public reads (market, rules, fixtures) work immediately. For *your team and leagues*,
the plugin needs your Sport5 session cookie:

1. Open <https://fantasywc.sport5.co.il> while logged in.
2. DevTools → **Network** → click any `dreamteam.sport5.co.il/api/...` request.
3. **Headers** → copy the full **Cookie** request-header value.
4. Set it before launching Claude Code:

```bash
export SPORT5_COOKIE='<paste the Cookie header here>'
```

Or just run `/fantasy-setup` for a guided walkthrough that also verifies the
connection. The cookie expires periodically — re-copy it if private tools start
failing.

## 5. Get advice

```text
/snapshot-league                  # capture this round's top teams (do this weekly)
/squad-advice qf                  # plan for the quarter-final round
/league-round-utilization כצים    # private league: played vs upcoming this round
/league-watchlist כצים            # upcoming matches that matter for the league
```

Or ask in natural language — *"who should I captain this week?"* — and the
`weekly-squad-advisor` skill activates automatically.

## What you get back

**Squad advice:** a concrete, rules-validated plan — transfers, captain and vice,
starting XI and bench, chip recommendation, and watch-outs.

**Round utilization:** per-team or league-wide counts of players whose national-team
match already played vs still upcoming, plus a watchlist of fixtures where league
managers have picks (Hebrew-formatted output). You apply squad changes yourself in
the app — the plugin never changes your team.

Next: [troubleshooting](troubleshooting.md) if anything misbehaves, or
[concepts](concepts.md) for the mental model.
