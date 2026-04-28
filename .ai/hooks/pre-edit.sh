#!/usr/bin/env bash
# ============================================================
# Hook: pre-edit
# Runs before an AI agent edits a file.
# Guards against edits that would violate architectural rules.
# ============================================================

set -euo pipefail

# --- Receive file path ---
if [[ -n "${1:-}" ]]; then
  FILE="$1"
else
  PAYLOAD=$(cat 2>/dev/null || true)
  FILE=$(echo "$PAYLOAD" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
fi

if [[ -z "${FILE:-}" ]]; then
  exit 0
fi

# --- Architecture boundary check ---
# Warn if editing a domain file that might receive infrastructure imports
if [[ "$FILE" == *"/domain/"* ]]; then
  echo ""
  echo "⚠️  [pre-edit] ARCHITECTURE REMINDER"
  echo "   Editing a file in the domain/ layer: $FILE"
  echo "   Rule: domain/ must have ZERO imports from infrastructure/."
  echo "   Do NOT import TypeORM, amqplib, ConfigService, or nodemailer here."
  echo ""
fi

# --- Warn about editing generated files ---
if [[ "$FILE" == *"/dist/"* ]]; then
  echo "⛔ [pre-edit] Attempting to edit a compiled file in dist/."
  echo "   Edit the source .ts file instead — dist/ is auto-generated."
  exit 1
fi

# --- Warn about .env ---
if [[ "$(basename "$FILE")" == ".env" ]]; then
  echo ""
  echo "⚠️  [pre-edit] You are about to edit the .env file."
  echo "   This file is git-ignored and should NEVER be committed."
  echo "   If adding a new variable, also add it to .env.example."
  echo ""
fi

exit 0
