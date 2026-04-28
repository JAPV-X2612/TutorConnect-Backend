#!/usr/bin/env bash
# ============================================================
# Hook: pre-edit
# Runs before an AI agent edits a file.
# Guards against edits that would violate project rules.
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

# --- Block editing compiled output ---
if [[ "$FILE" == *"/dist/"* ]]; then
  echo "⛔ [pre-edit] Attempting to edit a compiled file in dist/."
  echo "   Edit the source .ts file instead — dist/ is auto-generated."
  exit 1
fi

# --- Warn about editing migration files ---
# Migrations are append-only: never modify one that has already run in any environment.
if [[ "$FILE" == *"/migrations/"* ]]; then
  echo ""
  echo "⚠️  [pre-edit] MIGRATION FILE REMINDER"
  echo "   Editing: $FILE"
  echo "   Rule: migrations are append-only."
  echo "   Never modify a migration that has already been applied."
  echo "   To change the schema: generate a NEW migration with:"
  echo "     npx typeorm migration:generate src/migrations/Name -d src/data-source.ts"
  echo ""
fi

# --- Warn about data-source.ts ---
# synchronize: true must never be true outside local development.
if [[ "$(basename "$FILE")" == "data-source.ts" ]]; then
  echo ""
  echo "⚠️  [pre-edit] Editing data-source.ts"
  echo "   Rule: 'synchronize' must NEVER be set to true outside local development."
  echo "   Use explicit TypeORM migrations for all schema changes in staging/production."
  echo ""
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
