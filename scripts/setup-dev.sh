#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
npm ci --cache "${EOAPP_NPM_CACHE:-$(dirname -- "$PWD")/.cache/npm}" --no-audit --no-fund
