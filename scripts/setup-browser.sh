#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
source scripts/browser-env.sh
mkdir -p "$PLAYWRIGHT_BROWSERS_PATH" "$XDG_CONFIG_HOME"
if [[ -n "${PLAYWRIGHT_CHROMIUM_EXECUTABLE:-}" ]]; then
  [[ -x "$PLAYWRIGHT_CHROMIUM_EXECUTABLE" ]] || { echo 'Configured Chromium executable is unavailable.' >&2; exit 1; }
  echo 'Using the configured system Chromium for browser checks.'
else
  node node_modules/playwright/cli.js install chromium "$@"
fi
