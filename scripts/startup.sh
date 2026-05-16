#!/bin/bash
set -e

DB_FILE="${DB_PATH:-/app/data/dictionary.db}"

if [ ! -f "$DB_FILE" ]; then
  echo "=== Database not found at $DB_FILE — building from dsl/ ==="
  python scripts/parse_dsl.py
  echo "=== Database build complete ==="
else
  echo "=== Database found at $DB_FILE — skipping build ==="
fi

exec npm start
