# CI Workflow

CI runs on every pull request, every push to `main`, and on manual dispatch. It's
defined in [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) and runs on
`ubuntu-latest` (never self-hosted runners).

## Jobs

### `lint` / `validate`
- Validates that the plugin manifests are well-formed JSON
  (`.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.mcp.json`).

### `test` (typecheck + build)
- `npm ci` in `mcp-server/`.
- `npm run typecheck` — the primary correctness gate (`tsc --noEmit`).
- `npm run build` — confirms the esbuild bundle compiles.
- Verifies `dist/index.js` exists after build.

### `secret-scan`
- Greps the tree for high-signal credential patterns (e.g. a leaked `SPORT5_COOKIE`
  value, tokens) so secrets never land in history.

## Why typecheck is the gate

There is no unit-test suite yet, so `tsc --noEmit` in `strict` mode is the main
automated guarantee of correctness. Keep it green. If you add real tests, wire them
into `npm test` and add a step here.

## Reproducing CI locally

```bash
cd mcp-server
npm ci
npm run typecheck
npm run build
```

Equivalent to what CI does for the `test` job.
