# 001 — Ship the MCP server as a committed single-file esbuild bundle

**Status:** Accepted

## Context

The plugin's MCP server is written in TypeScript and depends on
`@modelcontextprotocol/sdk` and `zod`. Claude Code launches it via `.mcp.json` as
`node ${CLAUDE_PLUGIN_ROOT}/mcp-server/dist/index.js`.

We needed the server to start reliably on a user's machine with the least friction.
The obvious alternative — ship `src/` and run `npm install` at install time — has real
downsides:

- It requires every user to have a working npm setup and network access at install
  time, and to install dev/runtime dependencies before anything works.
- It risks pulling from the wrong registry. The author's global npm config points at
  an internal registry that is unreachable off its network; a personal project must
  not depend on that. (Mitigated separately by a pinned `.npmrc`, but a runtime
  install is one more place it can go wrong.)
- `node_modules` is large and slow to materialize for what is a small tool.

## Decision

Bundle the server with **esbuild** into a single self-contained ESM file at
`mcp-server/dist/index.js`, and **commit that file** to the repo. The runtime needs
only `node` — no `node_modules`, no install step.

The esbuild config emits a `createRequire` banner shim so the bundled CJS
dependencies resolve correctly under ESM, and relies on esbuild preserving the entry
file's shebang (the banner must **not** add a second one, or the bundle gets two
shebangs and fails to parse).

## Consequences

**Positive**

- Zero-dependency runtime: clone or install the plugin and it just runs under Node.
- No registry coupling at runtime; the public-registry `.npmrc` only matters at build
  time for contributors.
- Fast, predictable startup.

**Negative / trade-offs**

- The build artifact lives in version control. Contributors **must** rebuild and
  commit `dist/index.js` after changing `src/` — a stale bundle ships stale behavior.
  This is called out in the development workflow and CONTRIBUTING.
- Larger diffs on dependency or source changes (the bundle is regenerated).
- CI must verify the bundle builds (it does) to catch a forgotten rebuild.
