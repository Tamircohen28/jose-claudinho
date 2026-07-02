# Versioning & Releases

This project follows [Semantic Versioning](https://semver.org/) and keeps a
[Keep a Changelog](https://keepachangelog.com/)-style history in the root
[`CHANGELOG.md`](../../../CHANGELOG.md).

## Two independent version numbers

| Version | Where | Meaning |
|---------|-------|---------|
| **Plugin version** | `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `.codex-plugin/plugin.json` | The user-facing release of the multi-host plugin. All three manifests must always carry the **same** value. |
| **MCP server version** | `mcp-server/package.json` | The internal `fantasy-wc` server package. Bumped independently when the server's own API surface changes. |

The three plugin manifests are the source of truth for a release. CI enforces two
invariants via [`scripts/check-manifest-version-alignment.sh`](../../../scripts/check-manifest-version-alignment.sh)
(the `manifest-version-alignment` job in [`ci.yml`](../../../.github/workflows/ci.yml)):

- **S10-04** — the three manifests agree with each other.
- **S10-05** — once at least one `vX.Y.Z` tag exists, the manifests match the latest
  release tag (manifests are never left ahead of or behind the tag).

## When to bump

Follow SemVer against the **plugin's** observable behavior:

- **MAJOR** — a breaking change to how the plugin is installed, configured, or the
  contract of an existing MCP tool / skill.
- **MINOR** — a new MCP tool, skill, or backward-compatible capability.
- **PATCH** — a bug fix or docs/rules correction with no interface change.

Record every change under `## [Unreleased]` in `CHANGELOG.md` as you go, grouped into
`Added` / `Changed` / `Fixed` / `Removed`.

## Cutting a release

1. Open a PR that bumps the version in **all three** plugin manifests to the target
   `X.Y.Z` and moves the `[Unreleased]` entries under a new `## [X.Y.Z] - YYYY-MM-DD`
   heading in `CHANGELOG.md`. Rebuild and commit `mcp-server/dist/index.js` if any
   `mcp-server/src/` changed.
2. Merge the PR. CI's `manifest-version-alignment` job confirms the manifests agree.
3. Run the [**Release** workflow](../../../.github/workflows/release.yml)
   (`workflow_dispatch`) with the exact same `X.Y.Z` (no leading `v`). It:
   - re-validates the build (`npm ci`, `typecheck`, `build`, `dist/index.js` present),
   - asserts the manifests match the release input,
   - tags `vX.Y.Z` and creates the GitHub Release.

Never create tags by hand — the manifests and the tag must move together through the
release workflow. See [ci-workflow.md](ci-workflow.md) for the full CI gate and
[development-workflow.md](development-workflow.md) for the edit loop.
