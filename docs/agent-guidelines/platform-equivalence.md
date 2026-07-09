# Platform capability equivalence

Maps Claude Code features to Cursor and Codex equivalents for **jose-claudinho**.

Platform tool versions: [`../engineering/build-and-release/platform-targets.md`](../engineering/build-and-release/platform-targets.md).

## Instructions

| Capability | Claude Code | Cursor | Codex |
|------------|-------------|--------|-------|
| Repo policy | `CLAUDE.md` → `@AGENTS.md` | `.cursor/rules/000-project.mdc` → `AGENTS.md` | `AGENTS.md` |

## Skills

| Capability | Claude Code | Cursor | Codex |
|------------|-------------|--------|-------|
| Bundled skills | `skills/` via `.claude-plugin/plugin.json` | same paths in `.cursor-plugin/plugin.json` | same paths in `.codex-plugin/plugin.json` |

## MCP servers

| Capability | Claude Code | Cursor | Codex |
|------------|-------------|--------|-------|
| Server config | `.mcp.json` via `mcpServers` in `.claude-plugin/plugin.json` | `mcpServers` in `.cursor-plugin/plugin.json` + `.cursor/mcp.json` for repo-open | `mcpServers` in `.codex-plugin/plugin.json` + optional `.codex/config.toml` |

Fill `${ENV_VAR}` placeholders locally — never commit live session tokens.

## Hooks / lifecycle automation

| Capability | Claude Code | Cursor | Codex |
|------------|-------------|--------|-------|
| Local push guard | `.githooks/pre-push` via `make hooks` | No native hooks — use branch discipline | No native hooks |

**Cursor substitute:** enforce read-only Sport5 policy via `AGENTS.md` and `.cursor/rules/000-project.mdc`.

## Claude-only features (documented asymmetry)

| Feature | Notes |
|---------|-------|
| Marketplace install | Claude Code: `/plugin marketplace add` — see README Quick Start |
| Local marketplace | `make plugin` registers `jose-claudinho@jose-claudinho` |

These are intentional; they do not block multi-platform skill and MCP parity.
