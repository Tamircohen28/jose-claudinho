# José Claudinho — developer convenience targets.
# The MCP server lives in mcp-server/; the runtime bundle (dist/index.js) is committed.

MCP         := mcp-server
PLUGIN      := jose-claudinho
MARKETPLACE := jose-claudinho

.PHONY: help install update uninstall typecheck build clean bundle plugin cursor-plugin codex-plugin hooks agent-check \
	check-agent-drift check-feature-equivalence check-platform-targets \
	platform-targets-sync platform-targets-assert agent\:check agent-polish-gate assert-contract repo-standards-gate

MANIFESTS := .claude-plugin/plugin.json .cursor-plugin/plugin.json .codex-plugin/plugin.json .mcp.json .agents/plugins/marketplace.json $(MCP)/package.json

CURSOR_PLUGIN_DIR := $(HOME)/.cursor/plugins/local/$(PLUGIN)
TAMIRS_CONTRACT ?= $(HOME)/Projects/tamirs-superpowers/skills/repo/_contract

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install MCP server dependencies (public npm registry)
	cd $(MCP) && npm install

update: bundle ## Refresh MCP bundle and reinstall plugin for your host
	@echo "── update complete — run 'make plugin', 'make cursor-plugin', or 'make codex-plugin' for your host ──"

uninstall: clean ## Remove local Cursor symlink and build artifacts
	@rm -rf "$(CURSOR_PLUGIN_DIR)" 2>/dev/null || true
	@echo "✓ removed local Cursor plugin symlink (if present) and build artifacts"

typecheck: ## Type-check the MCP server (the primary correctness gate)
	cd $(MCP) && npm run typecheck

build: ## Build the single-file dist/index.js bundle
	cd $(MCP) && npm run build

clean: ## Remove the built bundle and node_modules
	rm -rf $(MCP)/dist $(MCP)/node_modules

bundle: ## Install deps + build the self-contained MCP bundle (step 1)
	cd $(MCP) && npm install && npm run build
	@test -f $(MCP)/dist/index.js && echo "✓ bundle: $(MCP)/dist/index.js"

plugin: bundle ## Build, then add the local marketplace & install the plugin (idempotent)
	@command -v claude >/dev/null 2>&1 || { \
		echo "✗ 'claude' CLI not found on PATH — install Claude Code first."; exit 1; }
	@echo "── marketplace '$(MARKETPLACE)' ──"
	@if claude plugin marketplace list --json 2>/dev/null | grep -q '"name": "$(MARKETPLACE)"'; then \
		echo "  already added → updating from source"; \
		claude plugin marketplace update $(MARKETPLACE) || \
			echo "  (update failed — marketplace kept as-is)"; \
	else \
		echo "  adding from $(CURDIR)"; \
		claude plugin marketplace add "$(CURDIR)"; \
	fi
	@echo "── plugin '$(PLUGIN)@$(MARKETPLACE)' ──"
	@if claude plugin list 2>/dev/null | grep -q '$(PLUGIN)@$(MARKETPLACE)'; then \
		echo "  already installed → updating"; \
		claude plugin update $(PLUGIN)@$(MARKETPLACE) || \
			echo "  (update failed — existing install kept; restart Claude Code to apply)"; \
	else \
		claude plugin install $(PLUGIN)@$(MARKETPLACE); \
	fi
	@echo "✓ done — restart Claude Code (or /plugin) to load the latest build."

cursor-plugin: bundle ## Symlink plugin into ~/.cursor/plugins/local for local testing
	@mkdir -p "$(HOME)/.cursor/plugins/local"
	@if [ -L "$(CURSOR_PLUGIN_DIR)" ] || [ -d "$(CURSOR_PLUGIN_DIR)" ]; then \
		rm -rf "$(CURSOR_PLUGIN_DIR)"; \
	fi
	@ln -s "$(CURDIR)" "$(CURSOR_PLUGIN_DIR)"
	@echo "✓ symlinked $(CURSOR_PLUGIN_DIR) → $(CURDIR)"
	@echo "  Reload Cursor (Developer: Reload Window) and enable fantasy-wc MCP in Settings → Tools & MCP."
	@echo "  See docs/user/install/cursor.md"

codex-plugin: bundle ## Register repo marketplace with Codex CLI (if installed)
	@command -v codex >/dev/null 2>&1 || { \
		echo "✗ 'codex' CLI not found on PATH — install Codex first."; exit 1; }
	@codex plugin marketplace add "$(CURDIR)" 2>/dev/null || \
		codex plugin marketplace add TamirCohen28/jose-claudinho 2>/dev/null || \
		{ echo "  try: codex plugin marketplace add TamirCohen28/jose-claudinho"; exit 1; }
	@echo "✓ marketplace registered — open Codex /plugins, install jose-claudinho, restart Codex."
	@echo "  See docs/user/install/codex.md"

hooks: ## Enable the local git hooks (blocks direct pushes to main)
	git config core.hooksPath .githooks
	@echo "✓ core.hooksPath = .githooks — direct pushes to main are now blocked locally."

# Canonical agent-validation gate (a.k.a. agent:check). CI mirrors this target.
check-agent-drift:
	bash scripts/check-agent-drift.sh .

check-feature-equivalence:
	bash scripts/check-feature-equivalence.sh .

check-platform-targets:
	bash scripts/check-platform-targets.sh .

platform-targets-sync:
	bash scripts/check-platform-targets.sh . --sync

platform-targets-assert:
	bash scripts/check-platform-targets.sh . --assert-current

agent\:check: check-agent-drift check-feature-equivalence check-platform-targets
	@for f in $(MANIFESTS); do \
		echo "Validating $$f"; \
		python3 -c "import json,sys; json.load(open('$$f'))" || exit 1; \
	done
	bash scripts/check-manifest-version-alignment.sh .
	cd $(MCP) && npm run typecheck

agent-polish-gate: platform-targets-sync platform-targets-assert agent\:check

assert-contract:
	@test -d "$(TAMIRS_CONTRACT)/scripts" || { echo "TAMIRS_CONTRACT not found at $(TAMIRS_CONTRACT)" >&2; exit 1; }
	bash "$(TAMIRS_CONTRACT)/scripts/assert-contract.sh" . app-gold

repo-standards-gate: agent-polish-gate assert-contract

agent-check: agent\:check ## Alias for agent:check (backward compatible)
