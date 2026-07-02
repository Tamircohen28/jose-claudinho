# Repo standards remediation plan — jose-claudinho

**Date:** 2026-07-02 · **Profile:** app-gold · **Source review:** `repo-standards-review-2026-07-02.md`
**Branch:** `feat/repo-standards-setup` · **Never merge / never `gh repo create` from this skill.**

## Phase 0 — IP scan gate
- IP scan already **CLEAN**. Re-run before final PR; no fixes needed.

## Phase 1 — README / structure
- No README gaps (banner, badges, prereqs, quick start, license line all present). No action.

## Phase 2 — Docs
- **S6-01 (P1):** move `docs/rules-en.md` → `docs/reference/rules-en.md`, `docs/rules-he.md` → `docs/reference/rules-he.md`; add links from `docs/README.md`. Update any references in code/manifests that point at the old paths.
- **S2-03 (P2):** add canonical `docs/CHANGELOG.md`. Keep the top-level `CHANGELOG.md` as the source and have `docs/CHANGELOG.md` point to it (or relocate) per contract.

## Phase 3 — Meta
- No LICENSE / .gitignore / CLAUDE.md / AGENTS.md gaps.

## Phase 4 — Governance / CI
- **S4-01 (P2):** add `.github/CODEOWNERS` → `* @TamirCohen28`.
- **S4-03 (P2):** enable branch protection on `main` after PR (require CI `validate` + `test` + `secret-scan` checks and 1 approving review). Applied via `gh api` in polish; noted as a post-merge governance step since a solo public repo cannot self-approve.
- **L6-03 / L6-04 (P1):** add an `agent:check` validate script (typecheck + build + manifest validation) to `mcp-server/package.json` and document it; wire multi-agent-repo to reference it.

## Phase 5 — Multi-agent (via `multi-agent-repo`)
- L6-03, L6-04, L3-01 (`.cursor/rules/`), L5-01 (`docs/agent-guidelines/`), L7-01 (check-agent-drift). Delegate to `multi-agent-repo` on the same branch.

## Phase 6 — Docs / changelog review
- Run `docs-review`; fix P1 findings. Add CHANGELOG entry for this standards pass.

## Phase 7 — Exit gate
- `assert-contract.sh` must show P1/P2/P3 = 0 for app-gold before PR.

## Sequencing
Phase 0 → 2 → 4 → 5 → 6 → 7. Branch-protection enablement (S4-03) is applied against the live repo separately (documented, not a file change).
