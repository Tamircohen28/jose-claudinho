## Summary
<!-- What does this PR do? 1-3 bullets. -->
-

## Test plan
- [ ] `npm run typecheck` passes (in `mcp-server/`)
- [ ] `npm run build` succeeds and `dist/index.js` is rebuilt + committed
- [ ] Tested manually in a Claude Code session

## Documentation
- [ ] CHANGELOG.md updated under [Unreleased]
- [ ] Docs updated if behavior/tools changed

## Constraints
- [ ] No write/transfer calls to the Sport5 API (read-and-recommend only)
- [ ] No cookies or tokens outside repo-root `.env` (`.env` is the committed credential store)

Closes #
