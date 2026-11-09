#!/bin/sh
# Writes the runtime settings read by the app (see src/config.ts), so one image can
# talk to any backend address without being rebuilt.
set -eu

escaped=$(printf '%s' "${API_URL:-}" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf 'window.__APP_CONFIG__ = { API_URL: "%s" };\n' "$escaped" > /usr/share/nginx/html/config.js

echo "runtime-config: API_URL=${API_URL:-<not set>}"
