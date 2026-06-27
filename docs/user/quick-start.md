# Quick Start

Zero to your first recommendation in about five minutes.

## Pick your host

| Host | Install | Then |
|------|---------|------|
| Claude Code | `make plugin` | Restart Claude Code |
| Cursor | `make cursor-plugin` | Reload Cursor window |
| Codex | `codex plugin marketplace add TamirCohen28/jose-claudinho` | Install in `/plugins`, restart |

Details: [claude-code](install/claude-code.md) · [cursor](install/cursor.md) · [codex](install/codex.md)

## 1. Prerequisites

- An AI host: [Claude Code](https://claude.com/claude-code), [Cursor](https://cursor.com), or [Codex](https://developers.openai.com/codex/plugins/)
- [Node.js ≥ 18](https://nodejs.org) (to build the bundle once)
- A Sport5 Fantasy WC 2026 account (for team/league reads)

## 2. Build the MCP bundle

```bash
make bundle
```

Or manually:

```bash
cd mcp-server && npm install && npm run build && cd ..
```

The bundle is a single self-contained file (`mcp-server/dist/index.js`).

## 3. Install the plugin

**Claude Code:**

```bash
make plugin
```

Then restart Claude Code (or run `/plugin`).

**Cursor:**

```bash
make cursor-plugin
```

Then reload Cursor (Developer: Reload Window).

**Codex:**

```bash
codex plugin marketplace add TamirCohen28/jose-claudinho
```

Open `/plugins`, install **jose-claudinho**, restart Codex.

To **update** after pulling: re-run your host's install command and restart the host.

## 4. Give it your session cookie

Public reads (market, rules, fixtures) work immediately. For *your team and leagues*,
the plugin needs your Sport5 session cookie:

1. Open <https://fantasywc.sport5.co.il> while logged in.
2. DevTools → **Network** → click any `dreamteam.sport5.co.il/api/...` request.
3. **Headers** → copy the full **Cookie** request-header value.
4. Set it before launching your AI host:

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
/league-round-report כצים         # full private-league report (recommended)
/team-round-utilization           # your squad: played vs upcoming
```

These skills are user-invoked only (`disable-model-invocation: true`) — run the
slash command (e.g. `/squad-advice`) to trigger the `squad-advice` skill; it does
not auto-fire from a plain message.

## What you get back

**Squad advice:** a concrete, rules-validated plan — transfers, captain and vice,
starting XI and bench, chip recommendation, and watch-outs.

**Round utilization:** per-team or league-wide counts of players whose national-team
match already played vs still upcoming, plus a watchlist of fixtures where league
managers have picks (Hebrew-formatted output). You apply squad changes yourself in
the app — the plugin never changes your team.

Using Claude Code, Cursor, and Codex on the same machine? See
[multi-host.md](multi-host.md).

Next: [troubleshooting](troubleshooting.md) if anything misbehaves, or
[concepts](concepts.md) for the mental model.
