# AGENTS.md — José Claudinho

Host-neutral guidance for AI agents working in this repository.

## What this repo is

A **multi-host plugin** for Sport5 Fantasy World Cup 2026:

| Host | Manifest | Install |
|------|----------|---------|
| Claude Code | `.claude-plugin/plugin.json` | `make plugin` |
| Cursor | `.cursor-plugin/plugin.json` | `make cursor-plugin` |
| Codex | `.codex-plugin/plugin.json` | `make codex-plugin` or `codex plugin marketplace add TamirCohen28/jose-claudinho` |

Shared components: `skills/`, `.mcp.json`, `mcp-server/dist/index.js`.

## Hard constraints

- **Read-and-recommend only** — never add Sport5 write/transfer APIs.
- **No credentials in the repo** — `SPORT5_COOKIE` via environment only.
- **Game rules** live in `mcp-server/src/rules.ts` only.

## Build gate

```bash
cd mcp-server && npm run typecheck && npm run build
```

Commit `mcp-server/dist/index.js` after any `mcp-server/src/` change.

## MCP tool naming

Hosts prefix tools differently. See `skills/shared/references/mcp-tool-names.md`.

## User docs

- [Claude Code install](docs/user/install/claude-code.md)
- [Cursor install](docs/user/install/cursor.md)
- [Codex install](docs/user/install/codex.md)

Claude-specific session guidance remains in [CLAUDE.md](CLAUDE.md).
