# Testing guidelines

There is no unit-test suite yet. The **correctness gate** is the type-checker plus a
successful bundle build:

```bash
cd mcp-server
npm run typecheck   # tsc --noEmit — primary gate
npm run build       # esbuild → dist/index.js
```

- Always rebuild `mcp-server/dist/index.js` after changing anything under `mcp-server/src/`
  and commit the regenerated bundle.
- CI runs the same gate (`.github/workflows/ci.yml`) plus manifest validation and a secret scan.
- Run `make agent-check` locally to mirror the CI agent-validation gate (drift check + typecheck + build).

See [AGENTS.md](../../AGENTS.md) for the canonical build gate.
