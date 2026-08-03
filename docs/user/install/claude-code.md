# Install — Claude Code

| | |
|---|---|
| **Validated against** | Claude Code **2.1.220** |
| **Minimum supported** | **2.0.0** |
| **Plugin manifest** | `.claude-plugin/plugin.json` |
| **Marketplace manifest** | `.claude-plugin/marketplace.json` |
| **Official docs** | [Plugins reference](https://code.claude.com/docs/en/plugins-reference) · [Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) · [Skills](https://code.claude.com/docs/en/skills) |

Check your version:

```bash
claude --version
```

## Prerequisites

- Claude Code 2.0.0 or newer (2.1.220 is what this release was validated on)
- Node.js ≥ 18 — to build the MCP bundle
- A Sport5 Fantasy WC 2026 account, for the private team/league reads

## Method A — standalone, straight from GitHub

No clone, no catalog. This repo carries its own `.claude-plugin/marketplace.json`
alongside the plugin manifest, so Claude Code installs it directly:

```text
/plugin marketplace add TamirCohen28/jose-claudinho
/plugin install jose-claudinho@jose-claudinho
/reload-plugins
```

The committed `mcp-server/dist/index.js` is a single self-contained file, so the MCP
server runs with no `node_modules` present — a marketplace install needs no build step.

To pick up a new release later:

```text
/plugin marketplace update jose-claudinho
/plugin update jose-claudinho@jose-claudinho
```

> Claude Code caches installed plugins by the `version` field in `plugin.json`. If a
> release did not bump the version, `/plugin update` is a no-op.

## Method B — via the tamirs-plugins catalog

If you already use the other plugins in that family:

```text
/plugin marketplace add Tamircohen28/plugins
/plugin install jose-claudinho@tamirs-plugins
/reload-plugins
```

## Method C — from a local clone (development)

```bash
git clone https://github.com/TamirCohen28/jose-claudinho.git
cd jose-claudinho
make install   # MCP deps
make plugin    # build bundle + register local marketplace + install
```

`make plugin` is idempotent — it updates an existing registration rather than failing.
Restart Claude Code (or run `/plugin`) afterward.

Equivalent by hand, from an interactive `claude` session:

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
alongside Cursor, Codex, or OpenCode with shared snapshot history, use one cookie source
(`.env` or shell export) and leave `FWC_DATA_DIR` unset.

To isolate snapshots for this host only:

```bash
export FWC_DATA_DIR="$HOME/.fantasy-wc-mcp/claude-data"
```

Restart Claude Code after changing env vars. Full guide: [multi-host.md](../multi-host.md).

## Verify

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

Or `/plugin update jose-claudinho@jose-claudinho` for a marketplace install. Restart
Claude Code either way.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Marketplace file not found` | You're on a revision older than 1.5.0, before `.claude-plugin/marketplace.json` was added. Update the clone, or use the catalog (Method B). |
| `/plugin update` does nothing | The release didn't bump `plugin.json` `version`. Check the [releases page](https://github.com/TamirCohen28/jose-claudinho/releases). |
| Skills don't appear after install | `/reload-plugins`, then restart Claude Code. `/reload-plugins` does **not** re-fetch from GitHub — it only reloads what's cached. |
| MCP tools missing | Confirm `mcp-server/dist/index.js` exists (`make bundle`) and that `node` is on PATH. |
| Private tools fail | `SPORT5_COOKIE` is unset or stale — re-export and restart. |

More: [troubleshooting.md](../troubleshooting.md).
