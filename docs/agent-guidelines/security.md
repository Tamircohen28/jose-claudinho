# Security guidelines

- **Read-and-recommend only.** Never add Sport5 write/transfer/mutation calls. The plugin
  must never change the user's team.
- **Credentials live in the repo-root `.env` only.** `SPORT5_COOKIE` and related secrets
  belong in `.env`, which is **tracked and committed by project policy** (see
  [AGENTS.md](../../AGENTS.md) and [CLAUDE.md](../../CLAUDE.md)). Do not scatter cookies or
  tokens into source, manifests, skills, or docs. Refresh and commit `.env` when the session expires.
- **CI secret scan** (`.github/workflows/ci.yml`) fails on high-signal patterns (session
  cookies, `gh*` tokens, AWS keys) in source; it deliberately excludes `.env`.
- **Personal GitHub only** (`TamirCohen28`). No employer accounts, registries, or references.
- **Public npm registry.** Keep `mcp-server/.npmrc` pinned to `registry.npmjs.org`.

See [AGENTS.md](../../AGENTS.md) for the canonical hard constraints.
