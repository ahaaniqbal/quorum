#!/usr/bin/env bash
# Reads secrets.env and wires keys into the right places:
#  - server keys  -> Convex env (secure, used by Convex functions)
#  - frontend keys -> .env.local (VITE_ prefixed, used by the browser)
# Safe to re-run. Only sets keys that have a value.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f secrets.env ]]; then
  echo "secrets.env not found — copy the template and fill it in."
  exit 1
fi

# shellcheck disable=SC1091
set -a; source secrets.env; set +a

set_server() {
  local name="$1" val="${!1:-}"
  if [[ -n "$val" ]]; then
    echo "  convex env: $name"
    CONVEX_AGENT_MODE=anonymous npx convex env set "$name" "$val" >/dev/null 2>&1 \
      && echo "    ✓ set" || echo "    ✗ failed ($name)"
  fi
}

echo "Setting Convex server env vars…"
for k in OPENAI_API_KEY FIBER_API_KEY ORANGESLICE_API_KEY VAPI_API_KEY DEEPGRAM_API_KEY \
         SMALLEST_API_KEY COMPOSIO_API_KEY SLACK_CHANNEL AGENTMAIL_API_KEY \
         HYDRADB_API_KEY FIRECRAWL_API_KEY; do
  set_server "$k"
done

# Frontend (public) keys into .env.local
echo "Writing frontend keys to .env.local…"
upsert_env_local() {
  local key="$1" val="$2"
  [[ -z "$val" ]] && return 0
  if grep -q "^${key}=" .env.local 2>/dev/null; then
    # portable in-place edit
    tmp="$(mktemp)"; sed "s|^${key}=.*|${key}=${val}|" .env.local > "$tmp" && mv "$tmp" .env.local
  else
    echo "${key}=${val}" >> .env.local
  fi
  echo "  ✓ ${key}"
}
upsert_env_local "VITE_VAPI_PUBLIC_KEY" "${VAPI_PUBLIC_KEY:-}"
upsert_env_local "VITE_VAPI_ASSISTANT_ID" "${VAPI_ASSISTANT_ID:-}"

echo "Done. Restart the Vite dev server to pick up frontend keys."
