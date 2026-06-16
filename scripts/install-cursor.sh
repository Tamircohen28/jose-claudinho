#!/usr/bin/env bash
# Symlink jose-claudinho into Cursor's local plugin directory for testing.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLUGIN_NAME="jose-claudinho"
TARGET="${HOME}/.cursor/plugins/local/${PLUGIN_NAME}"

mkdir -p "${HOME}/.cursor/plugins/local"
rm -rf "${TARGET}"
ln -s "${REPO_ROOT}" "${TARGET}"

echo "✓ ${TARGET} → ${REPO_ROOT}"
echo "  1. Reload Cursor (Developer: Reload Window)"
echo "  2. Settings → Tools & MCP — verify fantasy-wc is enabled"
echo "  3. export SPORT5_COOKIE='...' before private reads"
echo "  Or run: make cursor-plugin (same symlink + bundle build)"
