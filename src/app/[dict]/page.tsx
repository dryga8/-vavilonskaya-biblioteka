import { notFound } from 'next/navigation';
import {
  getDictionary,
  getLetters,
  getEntriesByLetter,
  searchEntries,
  suggestEntries,
  type Entry,
  type SearchResult,
} from '@/lib/db';
import SearchBox from './SearchBox';

interface Props {
  params: { dict: string };
  searchParams: { q?: string; letter?: string };
}

export async function generateMetadata({ params }: Props) {
  const dict = getDictionary(params.dict);
  if (!dict) return {};
  return { title: dict.name };
}

// ── Section header ─────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div
      className="flex items-center gap-3 px-5 py-2.5"
      style={{
        borderBottom: '1px solid #DDD8CC',
        background: 'rgba(201,168,76,0.06)',
      }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: '#4A4A6A' }}>
        {label}
      </span>
      <span className="text-[11px] font-mono" style={{ color: '#4A4A6A' }}>{count}</span>
    </div>
  );
}

// ── Entry row ──────────────────────────────────────────────────────────────

function EntryList({ entries, dictSlug }: { entries: (Entry | SearchResult)[]; dictSlug: string }) {
  return (
    <ul>
      {entries.map((e) => {
        const snippet = (e.body ?? '')
          .replace(/^= [^\n]+\n?/, '')
          .split('\n')
          .find((l) => l.trim().length > 0)
          ?.slice(0, 90) ?? '';
        return (
          <li key={e.id} style={{ borderBottom: '1px solid #DDD8CC' }}>
            <a
              href={`/${dictSlug}/${e.slug}`}
              className="flex items-stretch group transition-colors duration-100 hover:bg-gold/[0.07]"
            >
              {/* gold left strip */}
              <span
                className="w-[3px] flex-shrink-0 bg-gold/30 group-hover:bg-gold/70 transition-colors duration-100"
              />
              <div className="flex-1 flex items-baseline gap-3 px-4 py-3">
                <span className="font-semibold text-sm shrink-0" style={{ color: '#1A1A2E' }}>
                  {e.title}
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
      })}
    </ul>
  );
}

// ── Letter navigation ──────────────────────────────────────────────────────

function LetterNav({
  allLetters,
  activeLetter,
  query,
  dictSlug,
}: {
  allLetters: string[];
  activeLetter: string;
  query: string;
  dictSlug: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 my-5">
      {allLetters.map((l) => {
        const isActive = activeLetter === l && !query;
        return (
          <a
            key={l}
            href={`/${dictSlug}?letter=${l}`}
            className={[
              'w-8 h-8 flex items-center justify-center rounded text-sm font-mono font-semibold',
              'border transition-colors duration-150',
              isActive
                ? 'border-gold'
                : 'hover:border-gold',
            ].join(' ')}
            style={isActive
              ? { backgroundColor: '#C9A84C', color: '#0F0F1A', borderColor: '#C9A84C' }
              : { backgroundColor: '#1A1A2E', color: '#E8E0CC', borderColor: 'rgba(201,168,76,0.25)' }
            }
          >
            {l}
          </a>
        );
      })}
    </div>
  );
}

// ── Dict header ────────────────────────────────────────────────────────────

function DictHeader({ dict }: { dict: NonNullable<ReturnType<typeof getDictionary>> }) {
  return (
    <div className="mb-6 pb-5" style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
      <div className="flex items-start gap-4">
        <div
          className="w-1 h-10 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: dict.color }}
        />
        <div>
          <h1 className="text-xl font-bold text-cream tracking-wide">{dict.name}</h1>
          {dict.description && (
            <p className="text-sm text-cream/40 mt-0.5 font-serif italic">{dict.description}</p>
          )}
          <p className="text-[11px] text-cream/25 mt-1 font-mono uppercase tracking-widest">
            {dict.entry_count.toLocaleString('ru-RU')} статей
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DictPage({ params, searchParams }: Props) {
  const dict = getDictionary(params.dict);
  if (!dict) notFound();

  const letters = getLetters(params.dict);
  const query = searchParams.q?.trim() ?? '';
  const activeLetter = searchParams.letter ?? '';
  const allLetters = ['#', ...letters.filter((l) => l !== '#')];

  // ── Search mode ──────────────────────────────────────────────────────────
  if (query) {
    const { inTitle, inBody } = searchEntries(params.dict, query);
    const total = inTitle.length + inBody.length;
    const suggestions = total === 0 ? suggestEntries(params.dict, query) : [];

    return (
      <div>
        <DictHeader dict={dict} />
        <SearchBox dictSlug={params.dict} defaultValue={query} />
        <LetterNav allLetters={allLetters} activeLetter="" query={query} dictSlug={params.dict} />

        {total === 0 ? (
          <div
            className="mt-4 rounded-lg p-6"
            style={{ border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.04)' }}
          >
            <p className="text-cream/70 text-sm font-serif">
              По запросу{' '}
              <em className="not-italic font-semibold text-gold">«{query}»</em>{' '}
              ничего не найдено.
            </p>
            {suggestions.length > 0 && (
              <>
                <p className="mt-4 text-[10px] uppercase tracking-[0.3em] text-cream/30">
                  Возможно, вы имели в виду
                </p>
                <ul className="mt-3 space-y-2">
                  {suggestions.map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <span className="text-gold/40 text-xs">›</span>
                      <a
                        href={`/${params.dict}?q=${encodeURIComponent(s.title)}`}
                        className="text-sm text-gold hover:text-gold/70 transition-colors font-serif"
                      >
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <div className="mt-4 card-parchment">
            {inTitle.length > 0 && (
              <>
                <SectionHeader label="В названии статьи" count={inTitle.length} />
                <EntryList entries={inTitle} dictSlug={params.dict} />
              </>
            )}
            {inBody.length > 0 && (
              <div style={{ borderTop: inTitle.length > 0 ? '1px solid rgba(201,168,76,0.12)' : 'none' }}>
                <SectionHeader label="Упоминается в тексте" count={inBody.length} />
                <EntryList entries={inBody} dictSlug={params.dict} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Letter browse ────────────────────────────────────────────────────────
  const letterEntries = activeLetter ? getEntriesByLetter(params.dict, activeLetter) : [];

  return (
    <div>
      <DictHeader dict={dict} />
      <SearchBox dictSlug={params.dict} defaultValue="" />
      <LetterNav allLetters={allLetters} activeLetter={activeLetter} query="" dictSlug={params.dict} />

      {activeLetter && letterEntries.length > 0 && (
        <div className="card-parchment">
          <SectionHeader label={`Статьи на «${activeLetter}»`} count={letterEntries.length} />
          <EntryList entries={letterEntries} dictSlug={params.dict} />
        </div>
      )}

      {!activeLetter && (
        <div className="text-center py-16">
          <p className="text-cream/20 text-sm font-serif italic">
            Введите запрос или выберите букву для просмотра
          </p>
        </div>
      )}
    </div>
  );
}
