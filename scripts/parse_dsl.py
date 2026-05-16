#!/usr/bin/env python3
"""Parse DSL dictionary file into SQLite with FTS5."""

import html as html_lib
import re
import sqlite3
import unicodedata
from pathlib import Path

DSL_FILE = Path(r"C:\Users\PC\En-Ru\En-Ru_Americana\AmericanaEnRu.dsl")
DB_PATH = Path(__file__).parent.parent / "data" / "dictionary.db"

DICTIONARY = {
    "slug": "americana",
    "name": "Americana (En-Ru)",
    "description": "Энциклопедический словарь американской культуры",
    "color": "#534AB7",
    "language": "en",
    "reliability": "approved",
    "field": "GENERAL",
}

TAG_RE = re.compile(r'\[/?[^\]]*?\]')
REF_RE = re.compile(r'<<([^>]+)>>')
STAR_REF_RE = re.compile(r'\*([A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё \t\-,\'"]*)')
_TRAILING_FW = re.compile(
    r'\s+(?:and|or|the|of|in|to|a|an|see|also)\s*$', re.IGNORECASE
)


def strip_tags(text: str) -> str:
    # {X} → X  (DSL escapes for special chars like {"}  {"})
    text = re.sub(r'\{([^}]+)\}', r'\1', text)
    # Protect \[ and \] (literal brackets) before tag stripping
    text = text.replace(r'\[', '\x00LB\x00').replace(r'\]', '\x00RB\x00')
    # Remove all [tag] / [/tag]
    text = TAG_RE.sub('', text)
    # <<Reference>> is preserved here; linkify_body() converts it to <a> later
    # Restore literal brackets
    text = text.replace('\x00LB\x00', '[').replace('\x00RB\x00', ']')
    # collapse multiple spaces/tabs
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()


def slugify(title: str, seen: set) -> str:
    s = title.lower()
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-') or 'entry'
    base, n = s, 1
    while s in seen:
        s = f"{base}-{n}"
        n += 1
    seen.add(s)
    return s


def slugify_ref(title: str) -> str:
    """Slugify a cross-reference title (no dedup — used for href generation only)."""
    s = title.lower().strip()
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-') or 'entry'


def linkify_body(text: str, dict_slug: str) -> str:
    """Convert <<ref>> and *Word cross-references to HTML anchor tags."""
    def repl_ref(m):
        ref = m.group(1).strip()
        return f'<a href="/{dict_slug}/{slugify_ref(ref)}">{html_lib.escape(ref)}</a>'
    text = REF_RE.sub(repl_ref, text)

    def repl_star(m):
        ref = m.group(1).rstrip(' \t,')
        ref = _TRAILING_FW.sub('', ref).rstrip()
        if not ref:
            return m.group(0)
        return f'<a href="/{dict_slug}/{slugify_ref(ref)}">{html_lib.escape(ref)}</a>'
    text = STAR_REF_RE.sub(repl_star, text)
    return text


def first_letter(title: str) -> str:
    # digits → '#'; find first alpha or digit
    for ch in title:
        if ch.isalpha():
            return ch.upper()
        if ch.isdigit():
            return '#'
    return '#'


def parse_dsl(path: Path):
    """Yield (headwords_list, body_text) tuples."""
    with open(path, encoding='utf-8-sig') as f:  # utf-8-sig strips BOM if present
        lines = f.readlines()

    headwords: list[str] = []
    body_lines: list[str] = []

    def flush():
        if not headwords:
            return
        # pick first non-underscore headword as primary
        visible = [h for h in headwords if not h.startswith('_')]
        if not visible:
            return
        body = '\n'.join(filter(None, body_lines))
        yield visible, body

    for raw in lines:
        line = raw.rstrip('\r\n')

        if line.startswith('#') or line.strip() == '**':
            continue

        if not line.strip():
            # blank line → flush entry
            yield from flush()
            headwords.clear()
            body_lines.clear()
        elif line.startswith('\t'):
            cleaned = strip_tags(line.lstrip('\t').strip())
            if cleaned:
                body_lines.append(cleaned)
        else:
            # headword line; if we already have body, this is a new entry
            if body_lines:
                yield from flush()
                headwords.clear()
                body_lines.clear()
            headwords.append(line.strip())

    yield from flush()


def build_db(db_path: Path):
    db_path.parent.mkdir(parents=True, exist_ok=True)
    if db_path.exists():
        db_path.unlink()

    con = sqlite3.connect(db_path)
    con.executescript("""
        PRAGMA journal_mode=WAL;

        CREATE TABLE dictionaries (
            id          INTEGER PRIMARY KEY,
            slug        TEXT UNIQUE NOT NULL,
            name        TEXT NOT NULL,
            description TEXT,
            color       TEXT,
            language    TEXT,
            entry_count INTEGER DEFAULT 0,
            reliability TEXT,
            field       TEXT
        );

        CREATE TABLE entries (
            id            INTEGER PRIMARY KEY,
            dictionary_id INTEGER NOT NULL REFERENCES dictionaries(id),
            slug          TEXT NOT NULL,
            title         TEXT NOT NULL,
            body          TEXT,
            letter        TEXT,
            UNIQUE(dictionary_id, slug)
        );

        CREATE VIRTUAL TABLE entries_fts USING fts5(
            title,
            body,
            content=entries,
            content_rowid=id
        );

        CREATE TRIGGER entries_ai AFTER INSERT ON entries BEGIN
            INSERT INTO entries_fts(rowid, title, body)
            VALUES (new.id, new.title, new.body);
        END;
    """)

    con.execute(
        "INSERT INTO dictionaries(slug, name, description, color, language, reliability, field)"
        " VALUES(?,?,?,?,?,?,?)",
        (DICTIONARY['slug'], DICTIONARY['name'], DICTIONARY['description'],
         DICTIONARY['color'], DICTIONARY['language'],
         DICTIONARY.get('reliability'), DICTIONARY.get('field')),
    )
    dict_id = con.execute("SELECT last_insert_rowid()").fetchone()[0]

    seen_slugs: set[str] = set()
    count = 0

    for headwords, body in parse_dsl(DSL_FILE):
        primary = strip_tags(headwords[0])
        # skip entries with no alphanumeric content (e.g. bare "...")
        if not primary or not any(c.isalnum() for c in primary):
            continue

        # embed alt headwords into body so FTS finds them too
        alts = [strip_tags(h) for h in headwords[1:] if strip_tags(h)]
        linked_body = linkify_body(body, DICTIONARY['slug'])
        if alts:
            full_body = ('= ' + '; '.join(alts) + '\n' + linked_body).strip()
        else:
            full_body = linked_body

        slug = slugify(primary, seen_slugs)
        letter = first_letter(primary)

        con.execute(
            "INSERT INTO entries(dictionary_id, slug, title, body, letter) VALUES(?,?,?,?,?)",
            (dict_id, slug, primary, full_body, letter),
        )
        count += 1
        if count % 2000 == 0:
            con.commit()
            print(f"  {count} entries...")

    con.execute("UPDATE dictionaries SET entry_count=? WHERE id=?", (count, dict_id))
    con.commit()
    con.close()
    return count


def preview(db_path: Path, n: int = 5):
    con = sqlite3.connect(db_path)
    rows = con.execute(
        "SELECT title, letter, body FROM entries ORDER BY id LIMIT ?", (n,)
    ).fetchall()
    con.close()
    print(f"\n{'='*60}")
    print(f"First {n} entries:")
    print('='*60)
    for title, letter, body in rows:
        print(f"\n[{letter}] {title}")
        snippet = (body or '')[:200].replace('\n', ' ')
        if len(body or '') > 200:
            snippet += '…'
        print(f"    {snippet}")


if __name__ == '__main__':
    print(f"Parsing {DSL_FILE} …")
    total = build_db(DB_PATH)
    print(f"Done -- {total} entries -> {DB_PATH}")
    preview(DB_PATH)
