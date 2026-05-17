'use client';

export const dynamic = 'force-dynamic';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import type { Dictionary, GlobalSearchGroup, SearchResult } from '@/lib/db';
import { ReliabilityBadge } from '@/components/ReliabilityBadge';
import SearchPageBox from './SearchPageBox';
import SearchFilters from './SearchFilters';

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
  const { dict, results, hasMore } = group;
  const displayName = dict.name.replace(/\s*\([^)]*-[^)]*\)\s*$/, '');

  return (
    <div className="card-parchment">
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
            {results.length} {pluralResults(results.length)}
          </span>
          {dict.reliability && (
            <ReliabilityBadge reliability={dict.reliability} />
          )}
        </div>
      </div>

      <ul>
        {results.map((e) => (
          <ResultRow key={e.id} entry={e} dictSlug={dict.slug} backUrl={backUrl} />
        ))}
      </ul>

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
            Показать все результаты в «{displayName}» →
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

// ── Spinner ────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div
        className="w-7 h-7 rounded-full border-2 border-gold/20 border-t-gold animate-spin"
        style={{ borderTopColor: '#C9A84C' }}
      />
    </div>
  );
}

// ── Main content ───────────────────────────────────────────────────────────

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const dictsParam = searchParams.get('dicts') ?? '';
  const reliable = searchParams.get('reliable') === '1';

  const [groups, setGroups] = useState<GlobalSearchGroup[]>([]);
  const [allDicts, setAllDicts] = useState<Dictionary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setGroups([]);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ q: query });
    if (dictsParam) params.set('dicts', dictsParam);
    if (reliable) params.set('reliable', '1');
    fetch(`/api/search?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setGroups(data.groups ?? []);
        if (data.dicts?.length) setAllDicts(data.dicts);
        setLoading(false);
      })
      .catch(() => {
        setGroups([]);
        setLoading(false);
      });
  }, [query, dictsParam, reliable]);

  const allSlugs = allDicts.map((d) => d.slug);
  const rawDicts = dictsParam;
  let selectedDictSlugs: string[];
  if (!rawDicts) {
    selectedDictSlugs = allSlugs;
  } else if (rawDicts === 'none') {
    selectedDictSlugs = [];
  } else {
    selectedDictSlugs = rawDicts.split(',').filter((s) => allSlugs.includes(s));
  }

  const allSelected = selectedDictSlugs.length === allSlugs.length;

  const backParams = new URLSearchParams({ q: query });
  if (!allSelected && selectedDictSlugs.length > 0) {
    backParams.set('dicts', selectedDictSlugs.join(','));
  }
  const backUrl = `/search?${backParams.toString()}`;

  const totalResults = groups.reduce((sum, g) => sum + g.results.length, 0);

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
          {allDicts.length > 0 && (
            <div className="w-52 flex-shrink-0">
              <SearchFilters
                dicts={allDicts}
                selectedDictSlugs={selectedDictSlugs}
                query={query}
                reliable={reliable}
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {loading ? (
              <Spinner />
            ) : selectedDictSlugs.length === 0 ? (
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

// ── Page ───────────────────────────────────────────────────────────────────

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
