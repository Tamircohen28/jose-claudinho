# José Claudinho — developer convenience targets.
# The MCP server lives in mcp-server/; the runtime bundle (dist/index.js) is committed.

MCP         := mcp-server
PLUGIN      := jose-claudinho
MARKETPLACE := jose-claudinho

.PHONY: help install typecheck build clean bundle plugin hooks

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install MCP server dependencies (public npm registry)
	cd $(MCP) && npm install

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

hooks: ## Enable the local git hooks (blocks direct pushes to main)
	git config core.hooksPath .githooks
	@echo "✓ core.hooksPath = .githooks — direct pushes to main are now blocked locally."
