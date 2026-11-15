#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
source scripts/browser-env.sh
mkdir -p "$XDG_CONFIG_HOME"
exec node --test browser/staff.browser.js
