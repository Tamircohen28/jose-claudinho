# Repo standards review — jose-claudinho

**Date:** 2026-07-02
**Profile:** app-gold
**Repo:** Tamircohen28/jose-claudinho (public) — Claude Code plugin + MCP server for Fantasy World Cup 2026

## Executive summary

The repo is in strong shape: README has badges, prerequisites, quick start, license line, and banner; CI validates manifests, type-checks, builds, and runs a secret scan; Dependabot and a PR template are present; `AGENTS.md`, `CLAUDE.md`, and a top-level `CHANGELOG.md` exist. The employer-IP scan is **CLEAN**. Remaining gaps are moderate: two misplaced docs at the docs root, missing `CODEOWNERS`, no branch protection, no canonical `docs/CHANGELOG.md`, and several multi-agent scaffolding items (agent validation command, `.cursor/rules/`, `docs/agent-guidelines/`, drift check).

## Severity summary

| Severity | Count |
|----------|-------|
| P1 | 3 |
| P2 | 6 |
| P3 | 0 |

## Standards gaps (S1–S7)

| ID | Sev | Finding | Remediation |
|----|-----|---------|-------------|
| S6-01 | P1 | `docs/rules-en.md` and `docs/rules-he.md` sit at docs root (only `docs/README.md` belongs there) | Move to `docs/reference/` and link from `docs/README.md` |
| S2-03 | P2 | No canonical `docs/CHANGELOG.md` (a top-level `CHANGELOG.md` exists) | Add `docs/CHANGELOG.md` (or relocate/symlink the top-level one per contract) |
| S4-01 | P2 | `CODEOWNERS` missing | Add `.github/CODEOWNERS` assigning `@TamirCohen28` |
| S4-03 | P2 | Branch protection not enabled on `main` (no classic protection, no ruleset) | Enable protection: require CI checks + 1 approving review |

## Employer IP scan

**RESULT: CLEAN** — no employer (Wix) IP patterns found across source, docs, JSON, and lockfiles. Repo is public, so this must stay clean through all subsequent PRs.

## Multi-agent appendix (S8 / L-series)

| ID | Sev | Finding | Owner |
|----|-----|---------|-------|
| L6-03 | P1 | No `agent:check` / validate command in `mcp-server/package.json` | multi-agent-repo |
| L6-04 | P1 | CI exists but no documented agent validation command | multi-agent-repo |
| L3-01 | P2 | `.cursor/rules/` missing or empty | multi-agent-repo |
| L5-01 | P2 | `docs/agent-guidelines/` missing | multi-agent-repo |
| L7-01 | P2 | No check-agent-drift script | multi-agent-repo |

These are implemented in Phase 5 by the `multi-agent-repo` skill on the same branch.

## Docs read-only notes

- `docs/README.md` (index), `docs/CONTRIBUTING.md`, `docs/user/`, and `docs/engineering/` are present and correctly placed.
- `docs/rules-en.md` / `docs/rules-he.md` are game-rules reference content misfiled at the docs root — relocate under `docs/reference/`.
- README prose is complete; no thin-section issues found.

## CI notes

- `.github/workflows/ci.yml` runs on `ubuntu-latest` (GitHub-hosted) — **no self-hosted runner label**. `npm ci` resolves against the default public registry, so no Wix-registry blocker applies to CI.
- Jobs: manifest validation, typecheck + build (verifies `dist/index.js`), and a high-signal secret scan.

## Next steps

Proceed to plan mode → polish mode. Group P1 (S6-01 doc relocation, plus multi-agent L6-03/L6-04) first, then P2 governance/docs items. Multi-agent items land via `multi-agent-repo` in Phase 5.
