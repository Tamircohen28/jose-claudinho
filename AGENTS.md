# AGENTS.md — José Claudinho

Host-neutral guidance for AI agents working in this repository.

## What this repo is

A **multi-host plugin** for Sport5 Fantasy World Cup 2026:

| Host | Manifest | Install |
|------|----------|---------|
| Claude Code | `.claude-plugin/plugin.json` | `make plugin` |
| Cursor | `.cursor-plugin/plugin.json` | `make cursor-plugin` |
| Codex | `.codex-plugin/plugin.json` | `make codex-plugin` or `codex plugin marketplace add TamirCohen28/jose-claudinho` |

Shared components: `skills/`, `.mcp.json`, `mcp-server/dist/index.js`, `.env`.

## Hard constraints

- **Read-and-recommend only** — never add Sport5 write/transfer APIs.
- **Credentials in `.env` only** — `SPORT5_COOKIE` lives in the tracked repo-root `.env`
  (committed in this repo). Do not duplicate cookies into source, manifests, or docs.
  Refresh and commit `.env` when the Sport5 session expires.
- **Game rules** live in `mcp-server/src/rules.ts` only.

## Build gate

```bash
cd mcp-server && npm run typecheck && npm run build
```

Commit `mcp-server/dist/index.js` after any `mcp-server/src/` change.

## Versioning & releases

- The three plugin manifests (`.claude-plugin`, `.cursor-plugin`, `.codex-plugin`) share
  one [SemVer](https://semver.org/) version; `mcp-server/package.json` is versioned
  independently. CI enforces manifest/tag alignment.
- Record every user-visible change under `## [Unreleased]` in
  [`CHANGELOG.md`](CHANGELOG.md) as you make it.
- Full policy and the release-cutting steps: [versioning.md](docs/engineering/build-and-release/versioning.md).

## MCP tool naming

Hosts prefix tools differently. See `skills/shared/references/mcp-tool-names.md`.

## Agent guidelines

- [Testing](docs/agent-guidelines/testing.md) — the typecheck + build correctness gate.
- [Security](docs/agent-guidelines/security.md) — read-only, `.env` policy, secret scan.
- [Style](docs/agent-guidelines/style.md) — code layout and commit conventions.

Run `make agent-check` to validate agent setup (drift + manifests + typecheck) — CI mirrors this.

## User docs

- [Claude Code install](docs/user/install/claude-code.md)
- [Cursor install](docs/user/install/cursor.md)
- [Codex install](docs/user/install/codex.md)

Claude-specific session guidance remains in [CLAUDE.md](CLAUDE.md).
