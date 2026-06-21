# Install — Cursor

José Claudinho runs as a **Cursor plugin** (skills, commands, MCP) or as **MCP-only**
when you open this repo in Cursor.

## Prerequisites

- [Cursor](https://cursor.com)
- Node.js ≥ 18 on your PATH (stdio MCP server)
- Sport5 Fantasy WC 2026 account (for private reads)

## Option A — Full plugin (recommended)

Build the bundle and symlink into Cursor's local plugin directory:

```bash
make cursor-plugin
```

Or:

```bash
./scripts/install-cursor.sh
```

Then:

1. **Reload Cursor** — Command Palette → *Developer: Reload Window*
2. **Settings → Tools & MCP** — confirm `fantasy-wc` is enabled (green)
3. Set your cookie before private reads:

```bash
export SPORT5_COOKIE='<Cookie header from DevTools>'
```

Restart Cursor if you export the cookie after launch (MCP reads env at startup).

### Skills

Bundled skills load from `skills/` via `.cursor-plugin/plugin.json`. Each skill is
slash-invocable. Invoke explicitly:

```text
/squad-advice
/league-round-report
```

MCP tools appear as **`mcp__fantasy-wc__<tool>`** (not the Claude Code prefix).
See [mcp-tool-names.md](../../skills/shared/references/mcp-tool-names.md).

## Option B — MCP only (repo workspace)

If you clone this repo and open it in Cursor, [`.cursor/mcp.json`](../../../.cursor/mcp.json)
registers the MCP server without installing the full plugin bundle. You get all 13 tools
but must invoke skills manually or describe workflows in chat.

```bash
export SPORT5_COOKIE='...'
# Reload Cursor after setting env
```

## Update

```bash
git pull && make cursor-plugin
# Reload Cursor
```

## Cursor Marketplace (optional)

To publish for one-click install, submit the public repo at
[cursor.com/marketplace/publish](https://cursor.com/marketplace/publish) after local testing.
Plugins are manually reviewed and must be open source.

## Troubleshooting

- **MCP red / not loading** — check MCP Logs (Output panel → MCP Logs); ensure `node` is on PATH and `mcp-server/dist/index.js` exists (`make bundle`).
- **Private tools fail** — set `SPORT5_COOKIE` and reload.
- **Skills missing** — confirm symlink at `~/.cursor/plugins/local/jose-claudinho/.cursor-plugin/plugin.json`.
