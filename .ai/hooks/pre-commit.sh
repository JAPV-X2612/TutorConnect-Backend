#!/usr/bin/env bash
# ============================================================
# Hook: pre-commit
# Runs before a git commit to enforce quality gates.
# Can be called directly or used as a git pre-commit hook.
# ============================================================

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
FAILED=0

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║    TutorConnect — Pre-Commit Check       ║"
echo "╚══════════════════════════════════════════╝"

# --- Check if there are staged TypeScript changes in src/ ---
STAGED_TS=$(git diff --cached --name-only | grep '^src/.*\.ts$' || true)

if [[ -z "$STAGED_TS" ]]; then
  echo ""
  echo "ℹ️  No staged TypeScript files in src/ — skipping type and lint checks."
else
  cd "$ROOT"

  # --- TypeScript type check ---
  echo ""
  echo "▶ Running TypeScript type check..."
  if ! npx tsc --noEmit --skipLibCheck 2>&1 | head -30; then
    echo "✗ TypeScript errors found — fix before committing."
    FAILED=1
  else
    echo "✓ Types OK"
  fi

  # --- ESLint ---
  echo ""
  echo "▶ Running ESLint..."
  if ! npx eslint src/ --quiet 2>&1 | head -30; then
    echo "✗ ESLint errors found — fix before committing."
    FAILED=1
  else
    echo "✓ Lint OK"
  fi
fi

echo ""

if [[ "$FAILED" -eq 1 ]]; then
  echo "╔══════════════════════════════════════════╗"
  echo "║  ✗ Pre-commit checks FAILED — fix above  ║"
  echo "╚══════════════════════════════════════════╝"
  echo ""
  exit 1
fi

# --- Block .env from being committed ---
if git diff --cached --name-only | grep -q "^\.env$"; then
  echo "╔══════════════════════════════════════════╗"
  echo "║  ✗ .env file is staged — NEVER commit it ║"
  echo "╚══════════════════════════════════════════╝"
  echo ""
  exit 1
fi

echo "╔══════════════════════════════════════════╗"
echo "║   ✓ All pre-commit checks passed         ║"
echo "╚══════════════════════════════════════════╝"
echo ""
