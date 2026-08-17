# ==============================================================================
# tabstation - Makefile
# ==============================================================================

# --- Variables ----------------------------------------------------------------

APP_NAME        := tabstation
VERSION          = $(shell node -p "require('./package.json').version")
PACKAGE_NAME     = tab-station-$(VERSION).zip

# Colors
CYAN  := \033[36m
RESET := \033[0m
BOLD  := \033[1m

.DEFAULT_GOAL := help

# ==============================================================================
# HELP
# ==============================================================================

.PHONY: help
help: ## Show this help
	@echo ""
	@echo "$(BOLD)Tab Station$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""

# ==============================================================================
# BUILD
# ==============================================================================

.PHONY: build
build: ## Build for production
	pnpm build

.PHONY: package
package: build ## Build and zip dist/ into a loadable extension package
	@rm -f $(PACKAGE_NAME)
	@cd dist && zip -qr ../$(PACKAGE_NAME) . -x '*.DS_Store'
	@echo "$(PACKAGE_NAME)"

# ==============================================================================
# DEV
# ==============================================================================

.PHONY: dev
dev: ## Start dev server
	pnpm dev

# ==============================================================================
# DEPENDENCY MANAGEMENT
# ==============================================================================

.PHONY: install
install: ## Install dependencies
	pnpm install

# ==============================================================================
# TESTING
# ==============================================================================

.PHONY: test
test: ## Run tests
	pnpm test

# ==============================================================================
# CODE QUALITY
# ==============================================================================

.PHONY: lint
lint: ## Run linter
	pnpm lint

.PHONY: typecheck
typecheck: ## Type-check without emitting
	pnpm exec tsc --noEmit

.PHONY: fmt
fmt: ## Format code
	pnpm format

.PHONY: fmt-check
fmt-check: ## Verify formatting without writing
	pnpm format:check

.PHONY: check
check: fmt-check lint typecheck test ## Run all quality checks (fmt-check + lint + typecheck + test)

# ==============================================================================
# HOUSEKEEPING
# ==============================================================================

.PHONY: clean
clean: ## Remove build artifacts and generated files
	rm -rf dist
