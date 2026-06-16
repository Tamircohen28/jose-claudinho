# Install — Codex

José Claudinho runs as a **Codex plugin** with bundled skills and the `fantasy-wc` MCP server.

## Prerequisites

- [Codex CLI](https://developers.openai.com/codex/) or Codex app
- Node.js ≥ 18 on your PATH
- Sport5 Fantasy WC 2026 account (for private reads)

## Install from GitHub

```bash
codex plugin marketplace add TamirCohen28/jose-claudinho
```

Then open Codex, run `/plugins`, select the **José Claudinho** marketplace, install
**jose-claudinho**, and restart Codex.

### Local development

From a clone of this repo:

```bash
make codex-plugin
```

This builds the MCP bundle and registers the repo marketplace with the Codex CLI.

The catalog lives at [`.agents/plugins/marketplace.json`](../../../.agents/plugins/marketplace.json).

## Cookie

```bash
export SPORT5_COOKIE='<Cookie header from DevTools>'
```

Restart Codex after setting the variable so the MCP server inherits it.

## Usage

- Invoke the plugin with `@jose-claudinho` or ask Codex to use bundled skills.
- Skills: `weekly-squad-advisor`, `league-round-report`, etc. (`disable-model-invocation: true` — invoke via command or `@` mention).
- MCP tools appear as **`mcp__fantasy-wc__<tool>`**.

See [mcp-tool-names.md](../../skills/shared/references/mcp-tool-names.md).

## Update

```bash
git pull && make bundle
codex plugin marketplace upgrade jose-claudinho
```

Restart Codex to pick up skill and MCP changes.

## Manifest

Codex reads [`.codex-plugin/plugin.json`](../../../.codex-plugin/plugin.json) with
`skills`, `commands`, and `mcpServers` pointing at the shared repo layout.
