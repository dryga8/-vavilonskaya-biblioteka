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

# DSL_BASE: folder containing all DSL files (flat, no subdirectories).
# Locally: ./dsl/   On Railway: set DSL_PATH if files are elsewhere
_DSL_BASE_DEFAULT = str(Path(__file__).parent.parent / 'dsl')
DSL_BASE = Path(os.environ.get('DSL_PATH', _DSL_BASE_DEFAULT))

# ── Dictionary list ────────────────────────────────────────────────────────
# filename: exact DSL filename inside DSL_BASE (flat folder, no subdirs).

DICTIONARIES = [
    # ── GENERAL ──────────────────────────────────────────────────────────────
    {
        "slug": "americana",
        "name": "Americana",
        "description": "Англо-русский энциклопедический словарь американской культуры. Под ред. проф. Г.В. Чернова. Polygramma, 2005",
        "color": "#534AB7",
        "language": "en",
        "reliability": "approved",
        "field": "GENERAL",
        "filename": "AmericanaEnRu.dsl",
    },
    {
        "slug": "mueller",
        "name": "Мюллер",
        "description": "Классический англо-русский словарь. В.К. Мюллер, 24-е изд., 1995",
        "color": "#8B3A2A",
        "language": "en",
        "reliability": "caution",
        "field": "GENERAL",
        "filename": "En-Ru_Mueller_24.dsl",
    },
    {
        "slug": "collins",
        "name": "Collins",
        "description": "Collins Russian Dictionary, 2025. 75 000+ слов",
        "color": "#6C3483",
        "language": "en",
        "reliability": "caution",
        "field": "GENERAL",
        "filename": "En-Ru_Collins.dsl",
    },
    {
        "slug": "oxford",
        "name": "Oxford",
        "description": "Oxford Russian Dictionary. 75 000+ слов, 185 000+ значений",
        "color": "#1A5276",
        "language": "en",
        "reliability": "caution",
        "field": "GENERAL",
        "filename": "En-Ru_Oxford.dsl",
    },
    {
        "slug": "courtney-phrasal",
        "name": "Phrasal Verbs",
        "description": "Английские фразовые глаголы. R. Courtney",
        "color": "#2E4057",
        "language": "en",
        "reliability": "caution",
        "field": "GENERAL",
        "filename": "En-Ru_Phrasal_Verbs.dsl",
    },
    {
        "slug": "homophones",
        "name": "Омофоны",
        "description": "Англо-русский словарь омофонов. Мостицкий",
        "color": "#3a2d5c",
        "language": "en",
        "reliability": "caution",
        "field": "GENERAL",
        "filename": "En-Ru_Mostitsky_Homophones.dsl",
    },
    # ── BIO ───────────────────────────────────────────────────────────────────
    {
        "slug": "zoo-birds",
        "name": "Птицы",
        "description": "5-язычный каталог птиц (EN/RU/LAT/DE/FR)",
        "color": "#1a6b3a",
        "language": "en",
        "reliability": "approved",
        "field": "BIO",
        "filename": "ENG-RUS_Birds5L_ncl.dsl",
    },
    {
        "slug": "zoo-fish",
        "name": "Рыбы",
        "description": "5-язычный каталог рыб (EN/RU/LAT/DE/FR)",
        "color": "#1a4a6b",
        "language": "en",
        "reliability": "approved",
        "field": "BIO",
        "filename": "ENG-RUS_Fishes5L_ncl.dsl",
    },
    {
        "slug": "zoo-insects",
        "name": "Насекомые",
        "description": "5-язычный каталог насекомых (EN/RU/LAT/DE/FR)",
        "color": "#4a6b1a",
        "language": "en",
        "reliability": "approved",
        "field": "BIO",
        "filename": "ENG-RUS_Insects5L_ncl.dsl",
    },
    {
        "slug": "zoo-mammals",
        "name": "Млекопитающие",
        "description": "5-язычный каталог млекопитающих (EN/RU/LAT/DE/FR)",
        "color": "#6b3a1a",
        "language": "en",
        "reliability": "approved",
        "field": "BIO",
        "filename": "ENG-RUS_Mammals5L_ncl.dsl",
    },
    {
        "slug": "zoo-reptiles",
        "name": "Рептилии",
        "description": "5-язычный каталог рептилий (EN/RU/LAT/DE/FR)",
        "color": "#3a6b1a",
        "language": "en",
        "reliability": "approved",
        "field": "BIO",
        "filename": "ENG-RUS_Reptiles5L_ncl.dsl",
    },
    {
        "slug": "bio-general",
        "name": "Биология",
        "description": "О.И. Чибисова, Н.Н. Смирнов и др. © РУССО, 2003. 72 000 терминов",
        "color": "#2d5a27",
        "language": "en",
        "reliability": "caution",
        "field": "BIO",
        "filename": "BiologyEnRu.dsl",
    },
    {
        "slug": "biotech",
        "name": "Биотех",
        "description": "Англо-русский словарь по биотехнологиям. A.F. Valikhov и др., 2007",
        "color": "#1a5c3a",
        "language": "en",
        "reliability": "caution",
        "field": "BIO",
        "filename": "Biotech_Eng-Rus_di_1_1.dsl",
    },
    {
        "slug": "biotech2",
        "name": "Биотехнологии 2",
        "description": "",
        "color": "#2a5c3a",
        "language": "en",
        "reliability": "caution",
        "field": "BIO",
        "filename": "eng-rus_Biotechnology_v1.0.dsl",
    },
    {
        "slug": "plant-tissue",
        "name": "Ткани растений",
        "description": "Терминология по культуре тканей растений. Н.Н. Ерлыкина. АН Молдавской ССР, 1986",
        "color": "#3a5c1a",
        "language": "en",
        "reliability": "caution",
        "field": "BIO",
        "filename": "En-Ru Plant tissue culture 1986 Erlykina.dsl",
    },
    {
        "slug": "genetics",
        "name": "Генетика",
        "description": "Энциклопедический словарь по генетике. Н.А. Картель, Е.Н. Макеева, А.М. Мезенко. Минск, 1999",
        "color": "#2d1a5c",
        "language": "en",
        "reliability": "caution",
        "field": "BIO",
        "filename": "en-ru_kartel.dsl",
    },
    # ── MED ───────────────────────────────────────────────────────────────────
    {
        "slug": "who-vaccinology",
        "name": "Вакцинология ВОЗ",
        "description": "Глоссарий ВОЗ по вакцинологии и иммунизации. © WHO, 2009",
        "color": "#1a3a6b",
        "language": "en",
        "reliability": "approved",
        "field": "MED",
        "filename": "eng-rus_WHO_Vaccinology_1_0.dsl",
    },
    {
        "slug": "med-rivkin",
        "name": "Медицина. Ривкин",
        "description": "Англо-русский толковый медицинский словарь",
        "color": "#5c2d1a",
        "language": "en",
        "reliability": "caution",
        "field": "MED",
        "filename": "ENG-RUS_Medical-big.dsl",
    },
    {
        "slug": "med-drozdov",
        "name": "Медицина. Дроздов",
        "description": "Словарь по медицинской тематике и аббревиатурам",
        "color": "#6b1a2d",
        "language": "en",
        "reliability": "caution",
        "field": "MED",
        "filename": "En-Ru_Medicine_General.dsl",
    },
    {
        "slug": "pharmacopeia",
        "name": "Фармакопея",
        "description": "Фармацевтическая терминология",
        "color": "#4a1a5c",
        "language": "en",
        "reliability": "caution",
        "field": "MED",
        "filename": "Pharmacopeia.dsl",
    },
    {
        "slug": "psychology",
        "name": "Психология",
        "description": "Англо-русский психологический словарь",
        "color": "#1a4a5c",
        "language": "en",
        "reliability": "caution",
        "field": "MED",
        "filename": "PsychologyEnRu.dsl",
    },
    {
        "slug": "med-akzhigitov",
        "name": "Медицина. Акжигитов",
        "description": "Большой медицинский словарь. Г.Н. Акжигитов, Р.Г. Акжигитов. 100 000 терминов, 2005",
        "color": "#5c1a1a",
        "language": "en",
        "reliability": "caution",
        "field": "MED",
        "filename": "MedicalEnRu.dsl",
    },
    {
        "slug": "gcp",
        "name": "GCP",
        "description": "Термины надлежащей клинической практики",
        "color": "#1a5c5c",
        "language": "en",
        "reliability": "caution",
        "field": "MED",
        "filename": "en-ru_GCP_rustproof_1_0.dsl",
    },
    {
        "slug": "med-olek",
        "name": "Медицинский словарь. Олек",
        "description": "",
        "color": "#4a2d5c",
        "language": "en",
        "reliability": "caution",
        "field": "MED",
        "filename": "En-Ru_Medical_Olek.dsl",
    },
    # ── GEO ───────────────────────────────────────────────────────────────────
    {
        "slug": "usa-toponyms",
        "name": "Топонимы США",
        "description": "Географические названия США. На основе Г.Д. Томахина. М., Высшая школа, 1982",
        "color": "#1a3a5c",
        "language": "en",
        "reliability": "caution",
        "field": "GEO",
        "filename": "USA toponyms.dsl",
    },
    {
        "slug": "aus-nz",
        "name": "Австралия и НЗ",
        "description": "Сленг, топонимы и названия Австралии и Новой Зеландии",
        "color": "#1a5c4a",
        "language": "en",
        "reliability": "caution",
        "field": "GEO",
        "filename": "En-Ru_Australia_New_Zealand.dsl",
    },
    {
        "slug": "great-britain",
        "name": "Великобритания",
        "description": "Лингвострановедческий словарь. Адриан Р.У. Рум. © Русский язык-Медиа, 2003. 10 000 статей",
        "color": "#2d1a5c",
        "language": "en",
        "reliability": "caution",
        "field": "GEO",
        "filename": "GreatBritainEnRu.dsl",
    },
    {
        "slug": "geonames",
        "name": "Мировые топонимы",
        "description": "Словарь географических названий мира",
        "color": "#3a3a5c",
        "language": "en",
        "reliability": "caution",
        "field": "GEO",
        "filename": "GeoNames (En-Ru).dsl",
    },
    # ── AVIA ──────────────────────────────────────────────────────────────────
    {
        "slug": "civil-aviation",
        "name": "Авиация. Марасанов",
        "description": "Словарь по гражданской авиации. Марасанов, 1996",
        "color": "#1a2d5c",
        "language": "en",
        "reliability": "caution",
        "field": "AVIA",
        "filename": "Марасанов - Civil Aviation.dsl",
    },
    {
        "slug": "avia-space",
        "name": "Авиакосмос",
        "description": "Авиационно-космический словарь. Под ред. А.М. Мурашкевича. Военное изд. МО СССР, 1974. 70 000 терминов",
        "color": "#2d1a4a",
        "language": "en",
        "reliability": "caution",
        "field": "AVIA",
        "filename": "Мурашкевич - Avia & Space.dsl",
    },
    # ── TECH ──────────────────────────────────────────────────────────────────
    {
        "slug": "transport",
        "name": "Машиностроение",
        "description": "Англо-русский словарь по машиностроению. В.С. Косов, 2010",
        "color": "#3a3a1a",
        "language": "en",
        "reliability": "caution",
        "field": "TECH",
        "filename": "TransportEnRu.dsl",
    },
    {
        "slug": "auto-terms",
        "name": "Автомобили",
        "description": "Англо-русский автомобильный словарь",
        "color": "#4a3a1a",
        "language": "en",
        "reliability": "caution",
        "field": "TECH",
        "filename": "AutoEnRu.dsl",
    },
    # ── CHEM ──────────────────────────────────────────────────────────────────
    {
        "slug": "chem-terms",
        "name": "Химия",
        "description": "Англо-русский словарь химических терминов",
        "color": "#1a3a3a",
        "language": "en",
        "reliability": "caution",
        "field": "CHEM",
        "filename": "eng_rus_chemistry_tm_v01.dsl",
    },
    # ── ARTS ──────────────────────────────────────────────────────────────────
    {
        "slug": "theatre",
        "name": "Театр",
        "description": "Театральный словарь: театр, кино, ТВ, цирк. Э. Перель. М.: Филоматис, 2005",
        "color": "#5c1a3a",
        "language": "en",
        "reliability": "caution",
        "field": "ARTS",
        "filename": "Театр. Перель (En-Ru).dsl",
    },
    # ── AGRO ──────────────────────────────────────────────────────────────────
    {
        "slug": "agro",
        "name": "Агротехнологии",
        "description": "Словарь по агрономии и декоративному растениеводству. П.А. Адаменко, Г.В. Скобенко. СПб: Проспект Науки, 2010. 20 000 терминов",
        "color": "#2d5c1a",
        "language": "en",
        "reliability": "caution",
        "field": "AGRO",
        "filename": "Агротехнологии - Адаменко.dsl",
    },
    # ── OTHER ─────────────────────────────────────────────────────────────────
    {
        "slug": "wild-west",
        "name": "Дикий Запад",
        "description": "Энциклопедия Дикого Запада США. Юрий Стукалин. Яуза, Эксмо, 2014",
        "color": "#5c3a1a",
        "language": "en",
        "reliability": "caution",
        "field": "OTHER",
        "filename": "Wild_West.dsl",
    },
    {
        "slug": "bank-cards",
        "name": "Банковские карты",
        "description": "Терминология банковских карт",
        "color": "#1a4a3a",
        "language": "en",
        "reliability": "caution",
        "field": "OTHER",
        "filename": "px_bank_cards.dsl",
    },
]

# ── Regex helpers ──────────────────────────────────────────────────────────

TAG_RE = re.compile(r'\[/?[^\]]*?\]')
REF_RE = re.compile(r'<<([^>]+)>>')
STAR_REF_RE = re.compile(r'\*([A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё \t\-,\'"]*)')
_TRAILING_FW = re.compile(
    r'\s+(?:and|or|the|of|in|to|a|an|see|also)\s*$', re.IGNORECASE
)
_LANG_LINE_RE = re.compile(r'\[p\](LAT|RUS|ENG|DEU|FRA)\[/p\]')
_TRN_RE = re.compile(r'\[trn\](.*?)\[/trn\]', re.DOTALL)


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


# ── Zoo helpers ────────────────────────────────────────────────────────────

def parse_dsl_raw(lines: list[str]):
    """Like parse_dsl but yields (headwords, raw_body_lines) without stripping tags."""
    headwords: list[str] = []
    body_lines: list[str] = []

    def flush():
        if not headwords:
            return
        visible = [h for h in headwords if not h.startswith('_')]
        if not visible:
            return
        yield visible, list(body_lines)

    for raw in lines:
        line = raw.rstrip('\r\n')
        if line.startswith('#') or line.strip() == '**':
            continue
        if not line.strip():
            yield from flush()
            headwords.clear()
            body_lines.clear()
        elif line.startswith('\t'):
            body_lines.append(line.lstrip('\t').strip())
        else:
            if body_lines:
                yield from flush()
                headwords.clear()
                body_lines.clear()
            headwords.append(line.strip())

    yield from flush()


def extract_zoo_langs(raw_body_lines: list[str]) -> dict[str, str]:
    """Extract {LAT, RUS, ENG, DEU, FRA} from zoo DSL body lines."""
    result: dict[str, str] = {}
    for line in raw_body_lines:
        lang_m = _LANG_LINE_RE.search(line)
        if not lang_m:
            continue
        lang = lang_m.group(1)
        trn_m = _TRN_RE.search(line)
        if not trn_m:
            continue
        text = re.sub(r'\s+', ' ', strip_tags(trn_m.group(1))).strip()
        if text:
            result[lang] = text
    return result


# ── File helpers ────────────────────────────────────────────────────────────

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

        CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
            INSERT INTO entries_fts(entries_fts, rowid, title, body)
            VALUES ('delete', old.id, old.title, old.body);
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
    dsl_file = DSL_BASE / cfg['filename']
    if not dsl_file.is_file():
        print(f"  [ERROR] {cfg['name']}: file not found: {dsl_file}")
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
    is_zoo = slug.startswith('zoo-')

    if is_zoo:
        for headwords, raw_body_lines in parse_dsl_raw(lines):
            langs = extract_zoo_langs(raw_body_lines)
            eng = langs.get('ENG', '').strip()
            if not eng or eng == '—':
                continue

            lat = langs.get('LAT', '')
            rus = langs.get('RUS', '')
            deu = langs.get('DEU', '')
            fra = langs.get('FRA', '')

            title = eng
            body = ' | '.join(
                f"{lang}: {val}"
                for lang, val in [('LAT', lat), ('RUS', rus), ('ENG', eng), ('DEU', deu), ('FRA', fra)]
                if val and val != '—'
            )

            entry_slug = slugify(title, seen_slugs)
            letter = first_letter(title)

            con.execute(
                "INSERT OR IGNORE INTO entries(dictionary_id, slug, title, body, letter)"
                " VALUES(?,?,?,?,?)",
                (dict_id, entry_slug, title, body, letter),
            )
            count += 1
            if count % 5000 == 0:
                con.commit()
                print(f"    {count:,} статей...", flush=True)
    else:
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


# ── Zoo reload ─────────────────────────────────────────────────────────────

def _delete_zoo_dicts(con: sqlite3.Connection) -> None:
    """Remove all zoo-* dictionaries so they can be re-imported cleanly."""
    zoo_slugs = [d['slug'] for d in DICTIONARIES if d['slug'].startswith('zoo-')]
    for slug in zoo_slugs:
        row = con.execute("SELECT id FROM dictionaries WHERE slug=?", (slug,)).fetchone()
        if not row:
            print(f"  {slug} — не найден в БД, пропускаю")
            continue
        dict_id = row[0]
        n = con.execute(
            "SELECT COUNT(*) FROM entries WHERE dictionary_id=?", (dict_id,)
        ).fetchone()[0]
        # DELETE trigger (entries_ad) handles FTS cleanup row-by-row
        con.execute("DELETE FROM entries WHERE dictionary_id=?", (dict_id,))
        con.execute("DELETE FROM dictionaries WHERE id=?", (dict_id,))
        con.commit()
        print(f"  Удалён: {slug} ({n:,} статей)")


# ── Main ───────────────────────────────────────────────────────────────────

def _print_summary(grand_total: int) -> None:
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


def run(reset: bool = False, rezoo: bool = False) -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    if rezoo:
        print("Перепарсиваю zoo-* словари...\n")
        con = sqlite3.connect(DB_PATH)
        ensure_schema(con)
        _delete_zoo_dicts(con)
        grand_total = 0
        for cfg in DICTIONARIES:
            if not cfg['slug'].startswith('zoo-'):
                continue
            print(f"\nЗагружаю «{cfg['name']}»...")
            n = load_dictionary(con, cfg)
            if n > 0:
                print(f"  [OK] {cfg['name']}: {n:,} entries loaded")
            grand_total += n
        con.close()
        _print_summary(grand_total)
        return

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
    _print_summary(grand_total)


if __name__ == '__main__':
    reset = '--reset' in sys.argv
    rezoo = '--rezoo' in sys.argv
    run(reset=reset, rezoo=rezoo)
