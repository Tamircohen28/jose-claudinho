# Platform target versions

José Claudinho supports **four targets**. Machine-readable source:
[`platform-targets.json`](platform-targets.json).

| Platform | Min supported | Validated against | Latest known | Install guide |
|----------|---------------|-------------------|--------------|---------------|
| Claude Code | 2.0.0 | 2.1.220 | 2.1.220 | [claude-code.md](../../user/install/claude-code.md) |
| Cursor | 3.14.7 | 3.14.7 | 3.14.7 | [cursor.md](../../user/install/cursor.md) |
| Codex | 0.40.0 | 0.146.0 | 0.146.0 | [codex.md](../../user/install/codex.md) |
| OpenCode | 1.16.2 | 1.18.11 | 1.18.11 | [opencode.md](../../user/install/opencode.md) |

Every floor carries a `supported_min_source` in the JSON explaining how it was derived.
Two are worth calling out because they used to be wrong:

- **Cursor** was pinned at `0.45.0`, a version that predates Cursor's plugin system
  entirely. Cursor's own docs state no minimum version for plugins, so the floor is now
  the version this repo was actually validated against.
- **OpenCode** is floored at 1.16.2 — the oldest release on which `skills.paths`
  discovery of this repo's skills was confirmed with `opencode debug skill`.

## Capabilities by target

| Capability | Claude Code | Cursor | Codex | OpenCode |
|------------|:---:|:---:|:---:|:---:|
| Skills | ✅ | ✅ | ✅ | ✅ |
| MCP server | ✅ | ✅ | ✅ | ⚠️ hand-wired |
| Slash commands | ✅ | ✅ | ✅ | ❌ |
| Marketplace install | ✅ | ✅ | ✅ | ❌ |

OpenCode's gaps are recorded under `targets.opencode.capability_gaps` in the JSON, with a
reason for each.

## Manifest paths

| Target | Marketplace manifest | Plugin manifest |
|--------|---------------------|-----------------|
| Claude Code | `.claude-plugin/marketplace.json` | `.claude-plugin/plugin.json` |
| Cursor | none — manifest imported directly | `.cursor-plugin/plugin.json` |
| Codex | `.agents/plugins/marketplace.json` | `.codex-plugin/plugin.json` |
| OpenCode | none | `opencode.json` |

## Keeping this current

`schema_version` is 2. The `supported_targets` array is what
`scripts/check-platform-targets.sh` enforces — adding a target there makes the gate
require its README badge and version fields.

- `make platform-targets-sync` refreshes `latest_known` from npm for the npm-distributed
  targets. **Cursor has no public version endpoint** — bump it by hand.
- `make platform-targets-assert` fails when `latest_known` has moved past
  `validated_against`, i.e. when a target shipped a release nobody re-validated on.
- `make check-platform-targets` runs as part of `make agent:check` and enforces that the
  README badges match `validated_against`.

Update this file and the README badge row whenever repo skills adopt new platform APIs.
