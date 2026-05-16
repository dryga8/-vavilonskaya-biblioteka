#!/usr/bin/env python3
"""Parse DSL dictionary files into SQLite with FTS5.

Usage:
    python parse_dsl.py          # append new dictionaries (skips existing slugs)
    python parse_dsl.py --reset  # drop and recreate the whole DB (including Americana!)
"""

import html as html_lib
import os
import re
import sqlite3
import sys
import unicodedata
from pathlib import Path

# DB_PATH: where to write the database.
# On Railway set DB_PATH=/app/data/dictionary.db
DB_PATH = Path(os.environ.get('DB_PATH', str(Path(__file__).parent.parent / 'data' / 'dictionary.db')))

# DSL_BASE: root folder that contains all DSL subdirectories.
# Locally: C:\Users\PC\En-Ru   On Railway: /app/dsl
_DSL_BASE_DEFAULT = str(Path(r'C:\Users\PC\En-Ru'))
DSL_BASE = Path(os.environ.get('DSL_PATH', _DSL_BASE_DEFAULT))

# ── Dictionary list ────────────────────────────────────────────────────────
# rel_path: path relative to DSL_BASE that contains the DSL file.
# The script globs *.dsl inside it and picks the largest non-_abrv file.

DICTIONARIES = [
    # ── GENERAL / approved ───────────────────────────────────────────────────
    {
        "slug": "americana",
        "name": "Americana (En-Ru)",
        "description": "Энциклопедический словарь американской культуры",
        "color": "#534AB7",
        "language": "en",
        "reliability": "approved",
        "field": "GENERAL",
        "rel_path": r"En-Ru_Americana",
    },
    {
        "slug": "mueller",
        "name": "Мюллер",
        "description": "",
        "color": "#8B3A2A",
        "language": "en",
        "reliability": "approved",
        "field": "GENERAL",
        "rel_path": r"2Boff\Muller 24",
    },
    {
        "slug": "collins",
        "name": "Коллинз",
        "description": "",
        "color": "#6C3483",
        "language": "en",
        "reliability": "approved",
        "field": "GENERAL",
        "rel_path": r"Universal\Collins",
    },
    {
        "slug": "oxford",
        "name": "Oxford",
        "description": "",
        "color": "#1A5276",
        "language": "en",
        "reliability": "approved",
        "field": "GENERAL",
        "rel_path": r"Universal\Oxford",
    },
    {
        "slug": "courtney-phrasal",
        "name": "Courtney. Phrasal Verbs",
        "description": "",
        "color": "#2E4057",
        "language": "en",
        "reliability": "approved",
        "field": "GENERAL",
        "rel_path": r"Universal\Courtney - Phrasal Verbs",
    },
    # ── BIO / approved ────────────────────────────────────────────────────────
    {
        "slug": "zoo-birds",
        "name": "5-язычный словарь. Птицы",
        "description": "",
        "color": "#1a6b3a",
        "language": "en",
        "reliability": "approved",
        "field": "BIO",
        "rel_path": r"Special\ZOO\Birds",
    },
    {
        "slug": "zoo-fish",
        "name": "5-язычный словарь. Рыбы",
        "description": "",
        "color": "#1a4a6b",
        "language": "en",
        "reliability": "approved",
        "field": "BIO",
        "rel_path": r"Special\ZOO\Fish",
    },
    {
        "slug": "zoo-insects",
        "name": "5-язычный словарь. Насекомые",
        "description": "",
        "color": "#4a6b1a",
        "language": "en",
        "reliability": "approved",
        "field": "BIO",
        "rel_path": r"Special\ZOO\Insects",
    },
    {
        "slug": "zoo-mammals",
        "name": "5-язычный словарь. Млекопитающие",
        "description": "",
        "color": "#6b3a1a",
        "language": "en",
        "reliability": "approved",
        "field": "BIO",
        "rel_path": r"Special\ZOO\Mammals",
    },
    {
        "slug": "zoo-reptiles",
        "name": "5-язычный словарь. Рептилии",
        "description": "",
        "color": "#3a6b1a",
        "language": "en",
        "reliability": "approved",
        "field": "BIO",
        "rel_path": r"Special\ZOO\Reptiles",
    },
    {
        "slug": "bio-general",
        "name": "Биологический словарь",
        "description": "",
        "color": "#2d5a27",
        "language": "en",
        "reliability": "approved",
        "field": "BIO",
        "rel_path": r"Special\BIO\Biology",
    },
    {
        "slug": "biotech",
        "name": "Биотехнологии",
        "description": "",
        "color": "#1a5c3a",
        "language": "en",
        "reliability": "approved",
        "field": "BIO",
        "rel_path": r"Special\BIO\Biotech",
    },
    {
        "slug": "plant-tissue",
        "name": "Культура тканей растений",
        "description": "",
        "color": "#3a5c1a",
        "language": "en",
        "reliability": "approved",
        "field": "BIO",
        "rel_path": r"Special\BIO\Plant tissue culture",
    },
    # ── MED / approved ────────────────────────────────────────────────────────
    {
        "slug": "who-vaccinology",
        "name": "Вакцинология ВОЗ",
        "description": "",
        "color": "#1a3a6b",
        "language": "en",
        "reliability": "approved",
        "field": "MED",
        "rel_path": r"Special\MED\WHO Vaccinology",
    },
    # ── MED / caution ─────────────────────────────────────────────────────────
    {
        "slug": "med-rivkin",
        "name": "Медицинский словарь. Ривкин",
        "description": "",
        "color": "#5c2d1a",
        "language": "en",
        "reliability": "caution",
        "field": "MED",
        "rel_path": r"Special\MED\Medical - Ривкин",
    },
    {
        "slug": "med-drozdov",
        "name": "Медицина. Дроздов",
        "description": "",
        "color": "#6b1a2d",
        "language": "en",
        "reliability": "caution",
        "field": "MED",
        "rel_path": r"Special\MED\Medicine General",
    },
    {
        "slug": "pharmacopeia",
        "name": "Фармакопея",
        "description": "",
        "color": "#4a1a5c",
        "language": "en",
        "reliability": "caution",
        "field": "MED",
        "rel_path": r"Special\MED\Pharmacopeia",
    },
    {
        "slug": "psychology",
        "name": "Психология",
        "description": "",
        "color": "#1a4a5c",
        "language": "en",
        "reliability": "caution",
        "field": "MED",
        "rel_path": r"Special\MED\Psychology",
    },
    {
        "slug": "med-akzhigitov",
        "name": "Медицина. Акжигитов",
        "description": "",
        "color": "#5c1a1a",
        "language": "en",
        "reliability": "caution",
        "field": "MED",
        "rel_path": r"Special\MED\Медицина. Большой - Акжигитов",
    },
    {
        "slug": "genetics",
        "name": "Генетика. Картель",
        "description": "",
        "color": "#2d1a5c",
        "language": "en",
        "reliability": "caution",
        "field": "MED",
        "rel_path": r"Special\MED\Генетика - Картель",
    },
    {
        "slug": "gcp",
        "name": "Надлежащая клиническая практика",
        "description": "",
        "color": "#1a5c5c",
        "language": "en",
        "reliability": "caution",
        "field": "MED",
        "rel_path": r"Special\MED\Надлежащая клиническая практика",
    },
    # ── GEO / caution ─────────────────────────────────────────────────────────
    {
        "slug": "wild-west",
        "name": "Энциклопедия Дикого Запада",
        "description": "",
        "color": "#5c3a1a",
        "language": "en",
        "reliability": "caution",
        "field": "GEO",
        "rel_path": r"Special\GEO\Энциклопедия Дикого Запада",
    },
    {
        "slug": "usa-toponyms",
        "name": "Топонимы США",
        "description": "",
        "color": "#1a3a5c",
        "language": "en",
        "reliability": "caution",
        "field": "GEO",
        "rel_path": r"Special\GEO\USA toponyms",
    },
    {
        "slug": "aus-nz",
        "name": "Австралия и Новая Зеландия",
        "description": "",
        "color": "#1a5c4a",
        "language": "en",
        "reliability": "caution",
        "field": "GEO",
        "rel_path": r"Special\GEO\Australia - New Zealand",
    },
    {
        "slug": "great-britain",
        "name": "Великобритания",
        "description": "",
        "color": "#2d1a5c",
        "language": "en",
        "reliability": "caution",
        "field": "GEO",
        "rel_path": r"Special\GEO\Great Britain",
    },
    {
        "slug": "geonames",
        "name": "GeoNames. Топонимы",
        "description": "",
        "color": "#3a3a5c",
        "language": "en",
        "reliability": "caution",
        "field": "GEO",
        "rel_path": r"Special\GEO\GeoNames",
    },
    # ── AVIA / caution ────────────────────────────────────────────────────────
    {
        "slug": "civil-aviation",
        "name": "Гражданская авиация. Марасанов",
        "description": "",
        "color": "#1a2d5c",
        "language": "en",
        "reliability": "caution",
        "field": "AVIA",
        "rel_path": r"Special\AVIA\Марасанов - Civil Aviation",
    },
    {
        "slug": "avia-space",
        "name": "Авиационно-космический словарь",
        "description": "",
        "color": "#2d1a4a",
        "language": "en",
        "reliability": "caution",
        "field": "AVIA",
        "rel_path": r"Special\AVIA\Мурашкевич - Avia & Space",
    },
    # ── TECH / caution ────────────────────────────────────────────────────────
    {
        "slug": "transport",
        "name": "Машиностроение. Косов",
        "description": "",
        "color": "#3a3a1a",
        "language": "en",
        "reliability": "caution",
        "field": "TECH",
        "rel_path": r"Special\AUTO\Transport",
    },
    {
        "slug": "auto-terms",
        "name": "Автомобильные термины",
        "description": "",
        "color": "#4a3a1a",
        "language": "en",
        "reliability": "caution",
        "field": "TECH",
        "rel_path": r"Special\AUTO\Auto (Тверитнев)",
    },
    {
        "slug": "antennas",
        "name": "Антенны. Резников",
        "description": "",
        "color": "#3a1a3a",
        "language": "en",
        "reliability": "caution",
        "field": "TECH",
        "rel_path": r"Special\BIO\Biotechnology",
    },
    # ── CHEM / caution ────────────────────────────────────────────────────────
    {
        "slug": "chem-terms",
        "name": "Химические термины",
        "description": "",
        "color": "#1a3a3a",
        "language": "en",
        "reliability": "caution",
        "field": "CHEM",
        "rel_path": r"Special\CHEM\ChemTerms",
    },
    # ── ARTS / caution ────────────────────────────────────────────────────────
    {
        "slug": "theatre",
        "name": "Театральный словарь. Перель",
        "description": "",
        "color": "#5c1a3a",
        "language": "en",
        "reliability": "caution",
        "field": "ARTS",
        "rel_path": r"Special\ARTS\Театр. Перель",
    },
    # ── AGRO / caution ────────────────────────────────────────────────────────
    {
        "slug": "agro",
        "name": "Агротехнологии. Адаменко",
        "description": "",
        "color": "#2d5c1a",
        "language": "en",
        "reliability": "caution",
        "field": "AGRO",
        "rel_path": r"Special\AGRO\Агротехнологии - Адаменко",
    },
    # ── OTHER / caution ───────────────────────────────────────────────────────
    {
        "slug": "homophones",
        "name": "Омофоны. Мостицкий",
        "description": "",
        "color": "#3a2d5c",
        "language": "en",
        "reliability": "caution",
        "field": "OTHER",
        "rel_path": r"Mostitsky\Homophones",
    },
    {
        "slug": "bank-cards",
        "name": "Банковские карты",
        "description": "",
        "color": "#1a4a3a",
        "language": "en",
        "reliability": "caution",
        "field": "OTHER",
        "rel_path": r"Special\COMP\Bank Cards",
    },
]

# ── Regex helpers ──────────────────────────────────────────────────────────

TAG_RE = re.compile(r'\[/?[^\]]*?\]')
REF_RE = re.compile(r'<<([^>]+)>>')
STAR_REF_RE = re.compile(r'\*([A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё \t\-,\'"]*)')
_TRAILING_FW = re.compile(
    r'\s+(?:and|or|the|of|in|to|a|an|see|also)\s*$', re.IGNORECASE
)


def strip_tags(text: str) -> str:
    text = re.sub(r'\{([^}]+)\}', r'\1', text)
    text = text.replace(r'\[', '\x00LB\x00').replace(r'\]', '\x00RB\x00')
    text = TAG_RE.sub('', text)
    text = text.replace('\x00LB\x00', '[').replace('\x00RB\x00', ']')
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
    s = title.lower().strip()
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-') or 'entry'


def linkify_body(text: str, dict_slug: str) -> str:
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
    for ch in title:
        if ch.isalpha():
            return ch.upper()
        if ch.isdigit():
            return '#'
    return '#'


# ── File helpers ───────────────────────────────────────────────────────────

def find_dsl_file(directory: Path) -> Path | None:
    """Return the largest non-abrv DSL file in *directory* (non-recursive)."""
    candidates = [
        f for f in directory.glob('*.dsl')
        if not f.stem.lower().endswith('_abrv')
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda f: f.stat().st_size)


def read_dsl_lines(path: Path) -> list[str]:
    """Read DSL file, trying several encodings in order."""
    for enc in ('utf-8-sig', 'utf-16', 'cp1251', 'latin-1'):
        try:
            with open(path, encoding=enc) as f:
                return f.readlines()
        except (UnicodeDecodeError, UnicodeError):
            continue
    return []


# ── Parser ─────────────────────────────────────────────────────────────────

def parse_dsl(lines: list[str]):
    """Yield (headwords_list, body_text) tuples from pre-read DSL lines."""
    headwords: list[str] = []
    body_lines: list[str] = []

    def flush():
        if not headwords:
            return
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
            yield from flush()
            headwords.clear()
            body_lines.clear()
        elif line.startswith('\t'):
            cleaned = strip_tags(line.lstrip('\t').strip())
            if cleaned:
                body_lines.append(cleaned)
        else:
            if body_lines:
                yield from flush()
                headwords.clear()
                body_lines.clear()
            headwords.append(line.strip())

    yield from flush()


# ── Schema ─────────────────────────────────────────────────────────────────

def ensure_schema(con: sqlite3.Connection) -> None:
    con.executescript("""
        PRAGMA journal_mode=WAL;

        CREATE TABLE IF NOT EXISTS dictionaries (
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

        CREATE TABLE IF NOT EXISTS entries (
            id            INTEGER PRIMARY KEY,
            dictionary_id INTEGER NOT NULL REFERENCES dictionaries(id),
            slug          TEXT NOT NULL,
            title         TEXT NOT NULL,
            body          TEXT,
            letter        TEXT,
            UNIQUE(dictionary_id, slug)
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
            title,
            body,
            content=entries,
            content_rowid=id
        );

        CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
            INSERT INTO entries_fts(rowid, title, body)
            VALUES (new.id, new.title, new.body);
        END;
    """)


# ── Loader ─────────────────────────────────────────────────────────────────

def load_dictionary(con: sqlite3.Connection, cfg: dict) -> int:
    slug = cfg['slug']

    # Skip if already in DB
    row = con.execute("SELECT id FROM dictionaries WHERE slug=?", (slug,)).fetchone()
    if row:
        count = con.execute(
            "SELECT entry_count FROM dictionaries WHERE slug=?", (slug,)
        ).fetchone()[0]
        print(f"  [skip] {cfg['name']}: already in db ({count:,} entries)")
        return 0

    # Find DSL file
    directory = DSL_BASE / cfg['rel_path']
    if not directory.is_dir():
        print(f"  [ERROR] {cfg['name']}: directory not found: {directory}")
        return 0

    dsl_file = find_dsl_file(directory)
    if dsl_file is None:
        print(f"  [ERROR] {cfg['name']}: no DSL file in {directory}")
        return 0

    print(f"  Файл: {dsl_file.name} ({dsl_file.stat().st_size // 1024:,} KB)", flush=True)

    lines = read_dsl_lines(dsl_file)
    if not lines:
        print(f"  [ERROR] {cfg['name']}: could not read file")
        return 0

    # Insert dictionary record
    con.execute(
        "INSERT INTO dictionaries(slug, name, description, color, language, reliability, field)"
        " VALUES(?,?,?,?,?,?,?)",
        (slug, cfg['name'], cfg.get('description', ''),
         cfg['color'], cfg.get('language', 'en'),
         cfg.get('reliability'), cfg.get('field')),
    )
    dict_id = con.execute("SELECT last_insert_rowid()").fetchone()[0]

    seen_slugs: set[str] = set()
    count = 0

    for headwords, body in parse_dsl(lines):
        primary = strip_tags(headwords[0])
        if not primary or not any(c.isalnum() for c in primary):
            continue

        alts = [strip_tags(h) for h in headwords[1:] if strip_tags(h)]
        linked_body = linkify_body(body, slug)
        full_body = ('= ' + '; '.join(alts) + '\n' + linked_body).strip() if alts else linked_body

        entry_slug = slugify(primary, seen_slugs)
        letter = first_letter(primary)

        con.execute(
            "INSERT OR IGNORE INTO entries(dictionary_id, slug, title, body, letter)"
            " VALUES(?,?,?,?,?)",
            (dict_id, entry_slug, primary, full_body, letter),
        )
        count += 1
        if count % 5000 == 0:
            con.commit()
            print(f"    {count:,} статей...", flush=True)

    con.execute("UPDATE dictionaries SET entry_count=? WHERE id=?", (count, dict_id))
    con.commit()
    return count


# ── Main ───────────────────────────────────────────────────────────────────

def run(reset: bool = False) -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    if reset and DB_PATH.exists():
        DB_PATH.unlink()
        print("База данных удалена, создаю заново.\n")

    con = sqlite3.connect(DB_PATH)
    ensure_schema(con)

    grand_total = 0
    for cfg in DICTIONARIES:
        print(f"\nЗагружаю «{cfg['name']}»...")
        n = load_dictionary(con, cfg)
        if n > 0:
            print(f"  [OK] {cfg['name']}: {n:,} entries loaded")
        grand_total += n

    con.close()

    # Summary
    con2 = sqlite3.connect(DB_PATH)
    rows = con2.execute(
        "SELECT name, entry_count, field, reliability FROM dictionaries ORDER BY field, name"
    ).fetchall()
    con2.close()

    print(f"\n{'='*60}")
    print(f"Итого новых статей добавлено: {grand_total:,}")
    print(f"{'='*60}")
    print(f"{'Словарь':<40} {'Статей':>8}  {'Поле':<8} {'Надёжность'}")
    print('-' * 70)
    total_entries = 0
    for name, entry_count, field, reliability in rows:
        display = name[:38]
        print(f"{display:<40} {entry_count:>8,}  {field or '?':<8} {reliability or '—'}")
        total_entries += entry_count
    print('-' * 70)
    print(f"{'ВСЕГО':<40} {total_entries:>8,}")


if __name__ == '__main__':
    reset = '--reset' in sys.argv
    run(reset=reset)
