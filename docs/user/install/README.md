# Install José Claudinho

José Claudinho supports **four targets**. Pick yours:

| Target | Guide | Validated against | Minimum supported |
|--------|-------|------------------|-------------------|
| Claude Code | [claude-code.md](claude-code.md) | 2.1.220 | 2.0.0 |
| Cursor | [cursor.md](cursor.md) | 3.14.7 | 3.14.7 |
| Codex | [codex.md](codex.md) | 0.146.0 | 0.40.0 |
| OpenCode | [opencode.md](opencode.md) | 1.18.11 | 1.16.2 |

Machine-readable source of truth, including how each floor was derived:
[`docs/engineering/build-and-release/platform-targets.json`](../../engineering/build-and-release/platform-targets.json).

## What each target gets

| Component | Claude Code | Cursor | Codex | OpenCode |
|-----------|:---:|:---:|:---:|:---:|
| 11 skills | ✅ | ✅ | ✅ | ✅ |
| `fantasy-wc` MCP server (21 tools) | ✅ | ✅ | ✅ | ⚠️ manual |
| Slash commands (`/squad-advice`) | ✅ | ✅ | ✅ | ❌ model-invoked |
| Plugin manifest | ✅ | ✅ | ✅ | ❌ none needed |
| Marketplace install | ✅ | ✅ | ✅ | ❌ no marketplace |
| One-command update | ✅ | ✅ | ✅ | ❌ `git pull` |

⚠️ OpenCode does not read `.mcp.json`; declare the server by hand once. See
[opencode.md](opencode.md).

## Manifests, by target

| Target | Marketplace manifest | Plugin manifest |
|--------|---------------------|-----------------|
| Claude Code | `.claude-plugin/marketplace.json` | `.claude-plugin/plugin.json` |
| Cursor | the plugin manifest is imported directly | `.cursor-plugin/plugin.json` |
| Codex | `.agents/plugins/marketplace.json` | `.codex-plugin/plugin.json` |
| OpenCode | none | `opencode.json` (skill paths only) |

All three plugin manifests carry the same `version` — CI enforces it.

## Standalone or via the catalog

This repo is its own marketplace on every target that has one, so it installs with no
catalog dependency. It is *also* listed in the
[tamirs-plugins](https://github.com/Tamircohen28/plugins) catalog, which is the more
convenient path if you already use the other plugins in that family.

## Common to every target

Whichever host you use, you need:

- **Node.js ≥ 18** — the MCP server runs on it. The bundle is committed, so no
  `node_modules` at runtime.
- **A `SPORT5_COOKIE`** — only for private reads (your team, your leagues). Market,
  rules, and fixtures work without one. Run `/fantasy-setup`, or see
  [quick-start.md](../quick-start.md).

Running more than one host on the same machine? See [multi-host.md](../multi-host.md).

## Publishing

Distribution beyond local install is covered in [marketplace.md](marketplace.md).
