export const dynamic = 'force-dynamic';

import {
  getDictionaries,
  globalSearch,
  isDatabaseAvailable,
  type Dictionary,
  type GlobalSearchGroup,
  type SearchResult,
} from '@/lib/db';
import { ReliabilityBadge } from '@/components/ReliabilityBadge';
import SearchPageBox from './SearchPageBox';
import SearchFilters from './SearchFilters';

interface Props {
  searchParams: { q?: string; dicts?: string };
}

export async function generateMetadata({ searchParams }: Props) {
  const q = searchParams.q?.trim();
  return { title: q ? `Поиск: ${q}` : 'Глобальный поиск' };
}

// ── Result entry row ───────────────────────────────────────────────────────

function ResultRow({
  entry,
  dictSlug,
  backUrl,
}: {
  entry: SearchResult;
  dictSlug: string;
  backUrl: string;
}) {
  const snippet = (entry.body ?? '')
    .replace(/^= [^\n]+\n?/, '')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .find((l) => l.trim().length > 0)
    ?.slice(0, 90) ?? '';

  return (
    <li style={{ borderBottom: '1px solid #DDD8CC' }}>
      <a
        href={`/${dictSlug}/${entry.slug}?back=${encodeURIComponent(backUrl)}`}
        className="flex items-stretch group transition-colors duration-100 hover:bg-gold/[0.07]"
      >
        <span className="w-[3px] flex-shrink-0 bg-gold/30 group-hover:bg-gold/70 transition-colors duration-100" />
        <div className="flex-1 flex items-baseline gap-3 px-4 py-3">
          <span className="font-semibold text-sm shrink-0" style={{ color: '#1A1A2E' }}>
            {entry.title}
          </span>
          {snippet && (
            <span className="text-[12px] truncate font-serif" style={{ color: '#4A4A6A' }}>
              {snippet}
            </span>
          )}
        </div>
      </a>
    </li>
  );
}

// ── Dict group ─────────────────────────────────────────────────────────────

function DictGroup({
  group,
  query,
  backUrl,
}: {
  group: GlobalSearchGroup;
  query: string;
  backUrl: string;
}) {
  const { dict, results, totalCount } = group;
  const displayName = dict.name.replace(/\s*\([^)]*-[^)]*\)\s*$/, '');
  const hasMore = totalCount > results.length;

  return (
    <div className="card-parchment">
      {/* Group header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid #DDD8CC', background: 'rgba(201,168,76,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dict.color }} />
          <span className="text-sm font-semibold" style={{ color: '#1A1A2E' }}>
            {displayName}
          </span>
          <span className="text-[11px] font-mono" style={{ color: '#4A4A6A' }}>
            {totalCount.toLocaleString('ru-RU')} {pluralResults(totalCount)}
          </span>
          {dict.reliability && (
            <ReliabilityBadge reliability={dict.reliability} />
          )}
        </div>
      </div>

      {/* Entries */}
      <ul>
        {results.map((e) => (
          <ResultRow key={e.id} entry={e} dictSlug={dict.slug} backUrl={backUrl} />
        ))}
      </ul>

      {/* Show all link */}
      {hasMore && (
        <div
          className="px-5 py-3"
          style={{ borderTop: '1px solid #DDD8CC', background: 'rgba(201,168,76,0.03)' }}
        >
          <a
            href={`/${dict.slug}?q=${encodeURIComponent(query)}`}
            className="text-[12px] font-sans transition-colors"
            style={{ color: '#7A6030' }}
            onMouseOver={(e) => ((e.target as HTMLElement).style.color = '#C9A84C')}
            onMouseOut={(e) => ((e.target as HTMLElement).style.color = '#7A6030')}
          >
            Показать все {totalCount.toLocaleString('ru-RU')} результатов в «{displayName}» →
          </a>
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function pluralResults(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'результатов';
  if (mod10 === 1) return 'результат';
  if (mod10 >= 2 && mod10 <= 4) return 'результата';
  return 'результатов';
}

function pluralDicts(n: number) {
  if (n === 1) return 'словаре';
  if (n >= 2 && n <= 4) return 'словарях';
  return 'словарях';
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SearchPage({ searchParams }: Props) {
  const query = searchParams.q?.trim() ?? '';
  const allDicts = isDatabaseAvailable() ? getDictionaries() : [];
  const allSlugs = allDicts.map((d) => d.slug);

  // Resolve selected dicts from URL
  const rawDicts = searchParams.dicts;
  let selectedDictSlugs: string[];
  if (rawDicts === undefined) {
    selectedDictSlugs = allSlugs;
  } else if (!rawDicts || rawDicts === 'none') {
    selectedDictSlugs = [];
  } else {
    selectedDictSlugs = rawDicts.split(',').filter((s) => allSlugs.includes(s));
  }

  const allSelected = selectedDictSlugs.length === allSlugs.length;

  // Build current page URL for "back" links in entry pages
  const backParams = new URLSearchParams({ q: query });
  if (!allSelected && selectedDictSlugs.length > 0) {
    backParams.set('dicts', selectedDictSlugs.join(','));
  }
  const backUrl = `/search?${backParams.toString()}`;

  // Run search
  const groups =
    query && selectedDictSlugs.length > 0
      ? globalSearch(query, allSelected ? undefined : selectedDictSlugs)
      : [];

  const totalResults = groups.reduce((sum, g) => sum + g.totalCount, 0);

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.35em] text-gold/45 mb-5">
        Глобальный поиск
      </p>

      <SearchPageBox defaultValue={query} selectedDicts={allSelected ? [] : selectedDictSlugs} />

      {!query && (
        <div className="text-center py-20">
          <p className="text-cream/20 text-sm font-serif italic">
            Введите запрос для поиска по всем словарям
          </p>
        </div>
      )}

      {query && (
        <div className="mt-6 flex gap-6">
          {/* Filter sidebar */}
          {allDicts.length > 0 && (
            <div className="w-52 flex-shrink-0">
              <SearchFilters
                dicts={allDicts}
                selectedDictSlugs={selectedDictSlugs}
                query={query}
              />
            </div>
          )}

          {/* Results */}
          <div className="flex-1 min-w-0">
            {selectedDictSlugs.length === 0 ? (
              <div
                className="rounded-lg p-6"
                style={{ border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.04)' }}
              >
                <p className="text-cream/50 text-sm font-serif italic">
                  Выберите хотя бы один словарь для поиска.
                </p>
              </div>
            ) : groups.length === 0 ? (
              <div
                className="rounded-lg p-6"
                style={{ border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.04)' }}
              >
                <p className="text-cream/70 text-sm font-serif">
                  По запросу{' '}
                  <em className="not-italic font-semibold text-gold">«{query}»</em>{' '}
                  ничего не найдено.
                </p>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-cream/30 uppercase tracking-widest mb-4 font-mono">
                  Найдено: {totalResults.toLocaleString('ru-RU')}{' '}
                  {pluralResults(totalResults)} в {groups.length}{' '}
                  {pluralDicts(groups.length)}
                </p>
                <div className="space-y-5">
                  {groups.map((group) => (
                    <DictGroup
                      key={group.dict.slug}
                      group={group}
                      query={query}
                      backUrl={backUrl}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
