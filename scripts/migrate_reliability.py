#!/usr/bin/env python3
"""Add reliability and field columns to dictionaries table."""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "dictionary.db"

con = sqlite3.connect(DB_PATH)

for col, coltype in [("reliability", "TEXT"), ("field", "TEXT")]:
    try:
        con.execute(f"ALTER TABLE dictionaries ADD COLUMN {col} {coltype}")
        print(f"Added column: {col}")
    except sqlite3.OperationalError as e:
        print(f"  {col}: {e}")

con.execute(
    "UPDATE dictionaries SET reliability='approved', field='GENERAL' WHERE slug='americana'"
)
print(f"Updated {con.total_changes} row(s)")
con.commit()

rows = con.execute(
    "SELECT slug, name, reliability, field FROM dictionaries"
).fetchall()
for row in rows:
    print(row)
con.close()
