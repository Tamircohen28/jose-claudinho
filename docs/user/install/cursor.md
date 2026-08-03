# Install — Cursor

| | |
|---|---|
| **Validated against** | Cursor **3.14.7** |
| **Minimum supported** | **3.14.7** |
| **Plugin manifest** | `.cursor-plugin/plugin.json` |
| **Marketplace manifest** | none — Cursor imports the plugin manifest from the repo |
| **Official docs** | [Plugins](https://cursor.com/docs/plugins) · [Rules](https://cursor.com/docs/context/rules) |

Check your version: **Cursor → About Cursor**, or `cursor --version`.

> Cursor's docs state no minimum version for plugins. The floor above is the version this
> release was actually validated on rather than a guess — older builds may work.

José Claudinho runs as a **Cursor plugin** (skills, commands, MCP), as a **team
marketplace import** straight from GitHub, or as **MCP-only** when you open this repo in
Cursor.

## Prerequisites

- [Cursor](https://cursor.com) 3.14.7 or newer
- Node.js ≥ 18 on your PATH (stdio MCP server)
- Sport5 Fantasy WC 2026 account (for private reads)

## Option 0 — Import from repo (no clone)

Cursor can read `.cursor-plugin/plugin.json` directly out of a GitHub repo:

1. **Dashboard → Plugins → Team Marketplaces → Add Marketplace**
2. Choose **Import from Repo** and enter `TamirCohen28/jose-claudinho`
3. Install **jose-claudinho** and reload Cursor

Leave **Auto Refresh** on: Cursor re-reads the whole manifest on every push, so a version
bump is not required for you to pick up changes — unlike Claude Code.

The MCP server still needs the built bundle, so for full functionality prefer Option A
below or clone the repo once and run `make bundle`.

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

A repo-root `.env` (gitignored) also works — the MCP server loads it when Cursor does not
inject `SPORT5_COOKIE`.

### Skills

Bundled skills load from `skills/` via `.cursor-plugin/plugin.json`. Each skill is
slash-invocable. Invoke explicitly:

```text
/squad-advice
/league-round-report
```

MCP tools appear as **`mcp__fantasy-wc__<tool>`** (not the Claude Code prefix).
See [mcp-tool-names.md](../../../skills/shared/references/mcp-tool-names.md).

## Option B — MCP only (repo workspace)

If you clone this repo and open it in Cursor, [`.cursor/mcp.json`](../../../.cursor/mcp.json)
registers the MCP server without installing the full plugin bundle. You get all 21 tools
but must invoke skills manually or describe workflows in chat.

```bash
export SPORT5_COOKIE='...'
# Reload Cursor after setting env
```

## Multi-host on this machine

Each Cursor chat gets its own MCP child process — no cross-talk with Claude Code or Codex.
For shared snapshot history across hosts, use one cookie source and the default data dir.

To isolate Cursor snapshots:

```bash
export FWC_DATA_DIR="$HOME/.fantasy-wc-mcp/cursor-data"
```

Or add to [`.cursor/mcp.json`](../../../.cursor/mcp.json) under `fantasy-wc.env`:

```json
"FWC_DATA_DIR": "/Users/you/.fantasy-wc-mcp/cursor-data"
```

Reload Cursor after env changes. Full guide: [multi-host.md](../multi-host.md).

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
