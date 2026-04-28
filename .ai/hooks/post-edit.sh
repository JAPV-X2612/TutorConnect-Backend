#!/usr/bin/env bash
# ============================================================
# Hook: post-edit
# Runs after any file is written or edited by an AI agent.
# Receives the edited file path via stdin (Claude Code JSON payload)
# or as $1 (other agents).
# ============================================================

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# --- Determine the edited file path ---
# Claude Code passes a JSON payload on stdin; other agents pass $1
if [[ -n "${1:-}" ]]; then
  EDITED_FILE="$1"
else
  # Try to read from stdin (Claude Code PostToolUse payload)
  PAYLOAD=$(cat 2>/dev/null || true)
  EDITED_FILE=$(echo "$PAYLOAD" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
fi

if [[ -z "${EDITED_FILE:-}" ]]; then
  echo "[post-edit] No file path detected — skipping."
  exit 0
fi

echo "[post-edit] File changed: $EDITED_FILE"

# --- Skip non-TypeScript files ---
if [[ "$EDITED_FILE" != *.ts ]]; then
  echo "[post-edit] Not a .ts file — skipping lint."
  exit 0
fi

# --- Identify the service that owns the file ---
SERVICE_DIR=""
for SVC in patient-service doctor-service appointments-service api-gateway auth-service; do
  if [[ "$EDITED_FILE" == *"services/$SVC"* ]]; then
    SERVICE_DIR="$ROOT/services/$SVC"
    break
  fi
done

if [[ -z "$SERVICE_DIR" ]]; then
  echo "[post-edit] File is not inside a service directory — skipping."
  exit 0
fi

echo "[post-edit] Service: $(basename "$SERVICE_DIR")"

# --- Run ESLint on the changed file ---
cd "$SERVICE_DIR"
echo "[post-edit] Running ESLint..."
npx eslint "$EDITED_FILE" --fix --quiet 2>&1 || true

# --- Run TypeScript type check (no emit) ---
echo "[post-edit] Running TypeScript type check..."
npx tsc --noEmit --skipLibCheck 2>&1 | head -30 || true

echo "[post-edit] Done."
