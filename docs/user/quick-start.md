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

From an interactive `claude` session:

```text
/plugin marketplace add /Users/tamircohen/Projects/jose-claudinho
/plugin install jose-claudinho@jose-claudinho
```

(Adjust the path to wherever you cloned the repo.)

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
/snapshot-league        # capture this round's top teams (do this weekly)
/squad-advice qf        # plan for the quarter-final round
```

Or ask in natural language — *"who should I captain this week?"* — and the
`weekly-squad-advisor` skill activates automatically.

## What you get back

A concrete, rules-validated plan: the transfers to make, captain and vice, your
starting XI and bench, any chip recommendation, and the watch-outs. You apply it
yourself in the app — the plugin never changes your team.

Next: [troubleshooting](troubleshooting.md) if anything misbehaves, or
[concepts](concepts.md) for the mental model.
