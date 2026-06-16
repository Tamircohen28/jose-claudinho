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

Run `/fantasy-setup` for a guided walkthrough.

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
