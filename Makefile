# José Claudinho — developer convenience targets.
# The MCP server lives in mcp-server/; the runtime bundle (dist/index.js) is committed.

MCP := mcp-server

.PHONY: help install typecheck build clean

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
