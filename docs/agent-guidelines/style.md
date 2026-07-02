# Style guidelines

- **TypeScript** under `mcp-server/src/` — keep Zod schemas next to their tool handlers in
  `index.ts`; put shared transforms in `transform.ts`, storage in `storage.ts`.
- **Game rules** live only in `mcp-server/src/rules.ts` — never scatter rule constants.
- **Commit messages:** short imperative subject (≤ 72 chars), optional body explaining *why*
  (e.g. `Add cookie guard to league-table tool`).
- **Docs** live under `docs/` — user-facing in `docs/user/`, engineering in `docs/engineering/`,
  reference material in `docs/reference/`, agent guidance in `docs/agent-guidelines/`.

See [AGENTS.md](../../AGENTS.md) for canonical guidance and [CLAUDE.md](../../CLAUDE.md) for
Claude Code session specifics.
