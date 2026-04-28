#!/usr/bin/env bash
# ============================================================
# Hook: pre-commit
# Runs before a git commit to enforce quality gates.
# Can be called directly or wired into .claude/settings.json.
# ============================================================

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SERVICES=("patient-service" "doctor-service" "appointments-service" "api-gateway")
FAILED=0

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║         MediSync — Pre-Commit Check      ║"
echo "╚══════════════════════════════════════════╝"

# --- Check each service that has staged TypeScript changes ---
for SVC in "${SERVICES[@]}"; do
  SVC_DIR="$ROOT/services/$SVC"

  if [[ ! -d "$SVC_DIR" ]]; then
    continue
  fi

  # Only check services with staged .ts changes
  STAGED=$(git diff --cached --name-only -- "services/$SVC/src/**/*.ts" 2>/dev/null || true)
  if [[ -z "$STAGED" ]]; then
    continue
  fi

  echo ""
  echo "▶ Checking $SVC..."
  cd "$SVC_DIR"

  # TypeScript compile
  echo "  [tsc] Checking types..."
  if ! npx tsc --noEmit --skipLibCheck 2>&1 | head -20; then
    echo "  ✗ TypeScript errors found in $SVC"
    FAILED=1
  else
    echo "  ✓ Types OK"
  fi

  # ESLint
  echo "  [eslint] Linting..."
  if ! npx eslint src/ --quiet 2>&1 | head -20; then
    echo "  ✗ ESLint errors in $SVC"
    FAILED=1
  else
    echo "  ✓ Lint OK"
  fi

  cd "$ROOT"
done

echo ""

if [[ "$FAILED" -eq 1 ]]; then
  echo "╔══════════════════════════════════════════╗"
  echo "║  ✗ Pre-commit checks FAILED — fix above  ║"
  echo "╚══════════════════════════════════════════╝"
  echo ""
  exit 1
fi

# --- Verify .env is not staged ---
if git diff --cached --name-only | grep -q "^\.env$"; then
  echo "╔══════════════════════════════════════════╗"
  echo "║  ✗ .env file is staged — NEVER commit it ║"
  echo "╚══════════════════════════════════════════╝"
  exit 1
fi

echo "╔══════════════════════════════════════════╗"
echo "║   ✓ All pre-commit checks passed          ║"
echo "╚══════════════════════════════════════════╝"
echo ""
