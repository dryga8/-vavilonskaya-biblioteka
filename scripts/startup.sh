#!/bin/bash
set -e

DB_FILE="${DB_PATH:-/app/data/dictionary.db}"
DSL_DIR="${DSL_PATH:-/app/dsl}"

if [ ! -f "$DB_FILE" ]; then
  echo "=== Database not found at $DB_FILE ==="

  if [ ! -d "$DSL_DIR" ] || [ -z "$(find "$DSL_DIR" -name '*.dsl' -print -quit 2>/dev/null)" ]; then
    echo "WARNING: No DSL files found in $DSL_DIR — starting without database."
    echo "Upload DSL files to the /app/dsl volume and restart to build the database."
  else
    echo "=== Building database from DSL files in $DSL_DIR ==="
    python scripts/parse_dsl.py
    echo "=== Database build complete ==="
  fi
else
  echo "=== Database found at $DB_FILE — skipping build ==="
fi

exec npm start
