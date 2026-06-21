# Engineering

For people changing the code.

## Fast lane

| I want to… | Go to |
|------------|-------|
| Understand the system | [architecture/overview.md](architecture/overview.md) |
| Set up and make a change | [build-and-release/development-workflow.md](build-and-release/development-workflow.md) |
| Know what CI enforces | [build-and-release/ci-workflow.md](build-and-release/ci-workflow.md) |
| Understand *why* it's built this way | [decisions/](decisions/) |

## The 30-second model

- A **TypeScript MCP server** (`mcp-server/`) exposes 13 read-only tools over the
  Sport5 API, TheSportsDB fixtures, and local JSON snapshots.
- It's bundled by **esbuild** into a single committed file (`dist/index.js`) so the
  plugin runs with no `node_modules` at runtime.
- The plugin layer (`.claude-plugin/`, `.mcp.json`, `skills/`) wires that
  server into Claude Code and adds slash-invocable reasoning skills (`squad-advice`,
  `team-round-utilization`, `league-round-utilization`, `league-watchlist`).
- **`npm run typecheck` is the correctness gate** — there is no unit-test suite yet.

## Source layout

| File | Responsibility |
|------|----------------|
| `src/index.ts` | Tool registration: Zod schemas, handlers, `structuredContent` |
| `src/rules.ts` | Single source of truth for game rules |
| `src/sport5Client.ts` | Authenticated API client, cookie guards, bounded-concurrency pool |
| `src/transform.ts` | Raw API payloads → slim agent-friendly DTOs |
| `src/analysis.ts` | `buildSnapshot()`, `analyzeOwnership()` |
| `src/storage.ts` | Snapshot read/write |
| `src/fixtures.ts` | TheSportsDB fixtures, round mapping, Israel time formatting |
| `src/nations.ts` | Sport5 nation registry + Hebrew→TheSportsDB aliases |
| `src/roundUtilization.ts` | Team/league round status and watchlist aggregation |
