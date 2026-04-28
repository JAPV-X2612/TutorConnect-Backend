#!/usr/bin/env bash
# ============================================================
# Hook: notification
# Called by the AI agent to display formatted progress updates.
# Usage: bash .ai/hooks/notification.sh "MESSAGE" [info|success|warn|error]
# ============================================================

MESSAGE="${1:-}"
LEVEL="${2:-info}"
TIMESTAMP=$(date '+%H:%M:%S')

case "$LEVEL" in
  success)
    PREFIX="✅"
    ;;
  warn)
    PREFIX="⚠️ "
    ;;
  error)
    PREFIX="❌"
    ;;
  *)
    PREFIX="ℹ️ "
    ;;
esac

echo ""
echo "[$TIMESTAMP] $PREFIX  $MESSAGE"
echo ""
