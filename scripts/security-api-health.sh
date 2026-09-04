#!/usr/bin/env bash
# Safe Security Guardian probes for #/app — no paid DeepSeek/Azure translate/TTS/STT/Vision.
set -euo pipefail

API_BASE="${YUE_SECURITY_API_BASE:-http://localhost:8787}"
WEB_BASE="${YUE_SECURITY_WEB_BASE:-http://localhost:5173}"
FAIL=0

note() { printf '%s\n' "$*"; }
fail() { note "FAIL: $*"; FAIL=1; }
pass() { note "PASS: $*"; }

note "== JyutTranslate Security Guardian — API health =="
note "API_BASE=$API_BASE"
note "WEB_BASE=$WEB_BASE"

# --- Web ---
WEB_CODE="$(curl -s -o /dev/null -w '%{http_code}' "$WEB_BASE/" || true)"
if [[ "$WEB_CODE" == "200" ]]; then
  pass "Web root HTTP 200"
else
  fail "Web root expected 200, got ${WEB_CODE:-none}"
fi

# --- Health ---
HEALTH_FILE="$(mktemp)"
HEALTH_CODE="$(curl -s -o "$HEALTH_FILE" -w '%{http_code}' "$API_BASE/api/health" || true)"
if [[ "$HEALTH_CODE" != "200" ]]; then
  fail "/api/health expected 200, got ${HEALTH_CODE:-none}"
  cat "$HEALTH_FILE" 2>/dev/null || true
  rm -f "$HEALTH_FILE"
  exit 1
fi

if ! python3 - "$HEALTH_FILE" <<'PY'
import json, sys, re
path = sys.argv[1]
with open(path) as f:
    data = json.load(f)
ok = data.get("ok") is True
if not ok:
    print("JSON ok != true")
    sys.exit(2)
blob = json.dumps(data)
# Hard fail on obvious secret-shaped values or absolute env paths in the payload.
patterns = [
    r"sk-[a-zA-Z0-9]{20,}",
    r"whsec_[A-Za-z0-9+/=]+",
    r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+",  # JWT-like
    r"SUPABASE_SERVICE_ROLE",
    r"STRIPE_SECRET",
    r"AZURE_SPEECH_KEY\s*[:=]",
]
for p in patterns:
    if re.search(p, blob):
        print(f"Suspicious secret-like pattern in health: {p}")
        sys.exit(3)
env_file = (data.get("openai") or {}).get("envFile")
if isinstance(env_file, str) and env_file.strip():
    print(f"WARN: health discloses envFile={env_file}")
    # Warning only — still exit 0 for health-up; Security Guardian treats as finding.
mode = data.get("mode")
print(f"ok=true mode={mode} engines={json.dumps(data.get('engines'))}")
sys.exit(0)
PY
then
  fail "/api/health JSON validation failed (see above)"
else
  pass "/api/health ok:true"
fi

# Soft warning already printed by Python for envFile
if grep -q '"envFile"' "$HEALTH_FILE" 2>/dev/null; then
  note "FINDING: /api/health includes openai.envFile — strip from public payload (AUTOMATED)"
fi

# --- Auth config shape (no service role) ---
AUTH_FILE="$(mktemp)"
AUTH_CODE="$(curl -s -o "$AUTH_FILE" -w '%{http_code}' "$API_BASE/api/auth-config" || true)"
if [[ "$AUTH_CODE" == "200" ]]; then
  if python3 - "$AUTH_FILE" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
blob = json.dumps(data).lower()
if "service_role" in blob or "service-role" in blob:
    print("auth-config appears to mention service role")
    sys.exit(2)
print("auth-config keys:", sorted(data.keys()))
PY
  then
    pass "/api/auth-config shape OK (no service role field)"
  else
    fail "/api/auth-config may expose service role"
  fi
else
  fail "/api/auth-config expected 200, got ${AUTH_CODE:-none}"
fi

rm -f "$HEALTH_FILE" "$AUTH_FILE"

note "== Done (fail=$FAIL) =="
exit "$FAIL"
