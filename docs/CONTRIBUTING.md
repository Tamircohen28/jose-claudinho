# Contributing to José Claudinho

Thanks for wanting to improve it. This is a personal, non-commercial fan project,
but PRs and issues are welcome.

## Ground rule: read-and-recommend only

The single most important constraint: **this tool never changes the user's team.**
It reads game data and gives advice. Do not add any Sport5 write/transfer/mutation
calls. A PR that introduces a write endpoint will be declined.

## Development workflow

1. Fork to your own account and clone.
2. Build and verify the MCP server:
   ```bash
   cd mcp-server
   npm install        # uses the pinned public npm registry (.npmrc)
   npm run typecheck  # the correctness gate — must pass
   npm run build      # regenerate dist/index.js
   ```
3. Make your change under `mcp-server/src/` (or in `skills/` / `commands/`).
4. **Re-run `npm run typecheck` and `npm run build`, and commit the rebuilt
   `dist/index.js`** — it's the committed runtime artifact.
5. Update [`../CHANGELOG.md`](../CHANGELOG.md) under `## [Unreleased]`.
6. Open a PR using the template.

See [development-workflow.md](engineering/build-and-release/development-workflow.md)
for the detailed version.

## Code style

- TypeScript, ESM, `strict` mode. Keep `tsc --noEmit` clean.
- Game rules belong in `mcp-server/src/rules.ts` — the single source of truth. Don't
  scatter budget/cap/scoring constants elsewhere.
- Each MCP tool returns `structuredContent` with a slim, agent-friendly DTO — not the
  raw Sport5 payload. Add transforms in `transform.ts`.
- New cookie-gated tools must call `requireCookie()` so they fail with a clear,
  actionable message instead of an opaque 302.

## Never commit

- A `SPORT5_COOKIE`, token, or any session credential.
- The Sport5 T&C / FAQ documents (gitignored — copyrighted reference only).
- A Wix account, registry URL, or internal reference.

## Commit messages

Imperative subject ≤ 72 chars, optional body for the *why*. e.g.
`Label used bonus chips by verified API enum name`.
