import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'dictionary.db');

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH, { readonly: true });
    _db.pragma('journal_mode = WAL');
  }
  return _db;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface Dictionary {
  id: number;
  slug: string;
  name: string;
  description: string;
  color: string;
  language: string;
  entry_count: number;
}

export interface Entry {
  id: number;
  dictionary_id: number;
  slug: string;
  title: string;
  body: string;
  letter: string;
}

export interface SearchResult extends Entry {
  rank: number;
}

export interface SearchGroups {
  inTitle: SearchResult[];
  inBody: SearchResult[];
}

// ── Queries ────────────────────────────────────────────────────────────────

export function getDictionaries(): Dictionary[] {
  return getDb()
    .prepare('SELECT * FROM dictionaries ORDER BY name')
    .all() as Dictionary[];
}

export function getDictionary(slug: string): Dictionary | undefined {
  return getDb()
    .prepare('SELECT * FROM dictionaries WHERE slug = ?')
    .get(slug) as Dictionary | undefined;
}

export function getEntry(dictSlug: string, entrySlug: string): Entry | undefined {
  return getDb()
    .prepare(`
      SELECT e.* FROM entries e
      JOIN dictionaries d ON d.id = e.dictionary_id
      WHERE d.slug = ? AND e.slug = ?
    `)
    .get(dictSlug, entrySlug) as Entry | undefined;
}

export function getEntriesByLetter(dictSlug: string, letter: string): Entry[] {
  return getDb()
    .prepare(`
      SELECT e.* FROM entries e
      JOIN dictionaries d ON d.id = e.dictionary_id
      WHERE d.slug = ? AND e.letter = ?
      ORDER BY e.title
    `)
    .all(dictSlug, letter) as Entry[];
}

export function getLetters(dictSlug: string): string[] {
  const rows = getDb()
    .prepare(`
      SELECT DISTINCT e.letter FROM entries e
      JOIN dictionaries d ON d.id = e.dictionary_id
      WHERE d.slug = ?
      ORDER BY e.letter
    `)
    .all(dictSlug) as { letter: string }[];
  return rows.map((r) => r.letter);
}

// Strip FTS5 operators so user input can't break the query syntax.
function escapeFts(q: string): string {
  return q.replace(/["*^()\-]/g, ' ').replace(/\s+/g, ' ').trim();
}

const TITLE_LIMIT = 50;
const BODY_LIMIT = 150;

export function searchEntries(dictSlug: string, query: string): SearchGroups {
  const q = escapeFts(query);
  if (!q) return { inTitle: [], inBody: [] };

  const db = getDb();
  const stmt = db.prepare(`
    SELECT e.*, fts.rank FROM entries e
    JOIN entries_fts fts ON fts.rowid = e.id
    JOIN dictionaries d ON d.id = e.dictionary_id
    WHERE d.slug = ? AND entries_fts MATCH ?
    ORDER BY fts.rank
    LIMIT ?
  `);

  const inTitle = stmt.all(dictSlug, `title:${q}*`, TITLE_LIMIT) as SearchResult[];
  const titleIds = new Set(inTitle.map((r) => r.id));

  // Fetch enough rows so that after removing title matches we still have BODY_LIMIT.
  const allRows = stmt.all(
    dictSlug,
    `${q}*`,
    TITLE_LIMIT + BODY_LIMIT,
  ) as SearchResult[];
  const inBody = allRows.filter((r) => !titleIds.has(r.id)).slice(0, BODY_LIMIT);

  return { inTitle, inBody };
}

export function suggestEntries(dictSlug: string, query: string, limit = 8): Entry[] {
  const raw = query.trim();
  if (raw.length < 2) return [];

  const q = escapeFts(raw);
  if (!q) return [];

  const db = getDb();
  const seen = new Set<number>();
  // Collect from all passes first, slice at the end — this ensures later passes
  // (suffix LIKE) contribute even if earlier passes already filled the limit.
  // That matters for midword typos like "presedent" → last "dent" → "president".
  const candidates: Entry[] = [];

  const add = (rows: Entry[]) => {
    for (const r of rows) {
      if (!seen.has(r.id)) { seen.add(r.id); candidates.push(r); }
    }
  };

  const ftsStmt = db.prepare(`
    SELECT e.* FROM entries e
    JOIN entries_fts fts ON fts.rowid = e.id
    JOIN dictionaries d ON d.id = e.dictionary_id
    WHERE d.slug = ? AND entries_fts MATCH ?
    ORDER BY fts.rank
    LIMIT ?
  `);

  // Pass 1: FTS prefix — drop 1-3 chars from end (catches suffix typos: "squaree").
  for (let drop = 1; drop <= Math.min(3, q.length - 2); drop++) {
    add(ftsStmt.all(dictSlug, `title:${q.slice(0, -drop)}*`, limit) as Entry[]);
  }

  const likeStmt = db.prepare(`
    SELECT e.* FROM entries e
    JOIN dictionaries d ON d.id = e.dictionary_id
    WHERE d.slug = ? AND e.title LIKE ? ESCAPE '\\'
    ORDER BY e.title
    LIMIT ?
  `);

  // Pass 2 & 3: LIKE on first ~50 % and last ~45 % of the raw query.
  // Each pass is capped at ceil(limit/2) so both halves always contribute —
  // this is what lets "dent" from "presedent" surface "president" alongside
  // "present"/"preserve" from the "prese" prefix pass.
  const likePerPass = Math.ceil(limit / 2);
  for (const fragment of [
    raw.slice(0, Math.max(3, Math.ceil(raw.length * 0.5))),
    raw.slice(-Math.max(3, Math.floor(raw.length * 0.45))),
  ]) {
    if (fragment.length < 3) continue;
    const esc = fragment.replace(/[%_\\]/g, '\\$&');
    add(likeStmt.all(dictSlug, `%${esc}%`, likePerPass) as Entry[]);
  }

  return candidates.slice(0, limit);
}
