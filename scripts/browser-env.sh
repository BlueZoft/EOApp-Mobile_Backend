#!/usr/bin/env bash
_eoapp_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$(dirname -- "$_eoapp_root")/.cache/playwright}"
export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$(dirname -- "$_eoapp_root")/.cache/browser-config}"
if [[ -z "${PLAYWRIGHT_CHROMIUM_EXECUTABLE:-}" && -x /usr/bin/chromium ]]; then
  export PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium
fi
unset _eoapp_root
