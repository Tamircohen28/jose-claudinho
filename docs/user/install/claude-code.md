# Install — Claude Code

## Prerequisites

- [Claude Code](https://claude.com/claude-code)
- Node.js ≥ 18 (to build the MCP bundle)
- Sport5 Fantasy WC 2026 account (for private reads)

## Install

From the repo root:

```bash
make plugin
```

This builds `mcp-server/dist/index.js`, registers the local marketplace, and installs
`jose-claudinho@jose-claudinho`. Restart Claude Code (or run `/plugin`) afterward.

### Manual install

```text
/plugin marketplace add /path/to/jose-claudinho
/plugin install jose-claudinho@jose-claudinho
```

## Cookie

```bash
export SPORT5_COOKIE='<Cookie header from DevTools>'
```

Or put the same value in a repo-root `.env` file (gitignored) — the MCP server loads it
automatically when the host does not inject the variable.

Run `/fantasy-setup` for a guided walkthrough.

## Multi-host on this machine

Each Claude Code session spawns its own MCP process (stdio — no shared port). To run
alongside Cursor or Codex with shared snapshot history, use one cookie source (`.env` or
shell export) and leave `FWC_DATA_DIR` unset.

To isolate snapshots for this host only:

```bash
export FWC_DATA_DIR="$HOME/.fantasy-wc-mcp/claude-data"
```

Restart Claude Code after changing env vars. Full guide: [multi-host.md](../multi-host.md).

## Commands

```text
/squad-advice
/league-round-report כצים
/snapshot-league
```

MCP tools appear as `mcp__plugin_jose-claudinho_fantasy-wc__<tool>`.

## Update

```bash
git pull && make plugin
```

Then restart Claude Code.
