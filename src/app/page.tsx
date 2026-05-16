export const dynamic = 'force-dynamic';

import { getDictionaries, isDatabaseAvailable, type Dictionary } from '@/lib/db';
import { ReliabilityBadge } from '@/components/ReliabilityBadge';

// ── Color helpers ──────────────────────────────────────────────────────────

function adjustHex(hex: string, amount: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const r = clamp(parseInt(hex.slice(1, 3), 16) + amount);
  const g = clamp(parseInt(hex.slice(3, 5), 16) + amount);
  const b = clamp(parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

function textOnColor(hex: string): { text: string; subtle: string } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return L > 0.46
    ? { text: '#0F0F1A', subtle: 'rgba(15,15,26,0.5)' }
    : { text: 'rgba(255,255,255,0.92)', subtle: 'rgba(255,255,255,0.55)' };
}

// ── BookCard ───────────────────────────────────────────────────────────────

function BookCard({ dict }: { dict: Dictionary }) {
  const base = dict.color;
  const light = adjustHex(base, 40);
  const dark = adjustHex(base, -22);
  const spine = adjustHex(base, -65);
  const { text, subtle } = textOnColor(base);
  const displayName = dict.name.replace(/\s*\([^)]*-[^)]*\)\s*$/, '');

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Reliability badge — shown above the book so books align at the bottom */}
      {dict.reliability && (
        <ReliabilityBadge reliability={dict.reliability} />
      )}

      <a href={`/${dict.slug}`} className="book" title={dict.name}>
        <div
          className="book-inner"
          style={{
            width: 140,
            height: 200,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            background: `linear-gradient(158deg, ${light} 0%, ${base} 44%, ${dark} 100%)`,
            backgroundImage: [
              `linear-gradient(158deg, ${light} 0%, ${base} 44%, ${dark} 100%)`,
              'repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(255,255,255,0.025) 5px, rgba(255,255,255,0.025) 6px)',
            ].join(', '),
            borderLeft: `10px solid ${spine}`,
            borderRadius: '1px 3px 3px 1px',
            boxShadow: '4px 10px 22px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)',
            overflow: 'hidden',
          }}
        >
          {/* Spine highlight */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 2,
              background: 'rgba(255,255,255,0.16)',
              pointerEvents: 'none',
            }}
          />

          {/* Top language code */}
          <div style={{ padding: '10px 0 0', textAlign: 'center', flexShrink: 0 }}>
            <span
              style={{
                fontSize: 8,
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: subtle,
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
              }}
            >
              {dict.language}
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 10px',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                color: text,
                fontFamily: 'Georgia, serif',
                fontWeight: 700,
                fontSize: 13.5,
                letterSpacing: '0.06em',
                lineHeight: 1.25,
                maxHeight: 160,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {displayName}
            </span>
          </div>

          {/* Bottom badge — entry count */}
          <div
            style={{
              margin: '0 8px 9px',
              padding: '3px 0 4px',
              borderRadius: 2,
              background: 'rgba(0,0,0,0.22)',
              textAlign: 'center',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                display: 'block',
                color: subtle,
                fontSize: 9,
                fontFamily: 'monospace',
                letterSpacing: '0.04em',
              }}
            >
              {dict.entry_count.toLocaleString('ru-RU')}
            </span>
            <span
              style={{
                display: 'block',
                color: subtle,
                fontSize: 7.5,
                fontFamily: 'monospace',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginTop: 1,
              }}
            >
              статей
            </span>
          </div>
        </div>
      </a>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function HomePage() {
  if (!isDatabaseAvailable()) {
    return (
      <div className="text-center py-24">
        <p className="text-cream/40 text-sm font-serif italic">База данных не загружена</p>
        <p className="text-cream/20 text-xs font-mono mt-2">
          Загрузите dictionary.db в /app/data и перезапустите сервис
        </p>
      </div>
    );
  }

  const dicts = getDictionaries();

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.35em] text-gold/45 mb-5">
        Библиотека словарей
      </p>

      {/* Global search bar */}
      <form action="/search" method="get" className="flex gap-2 mb-8">
        <input
          type="search"
          name="q"
          placeholder="Поиск по всем словарям…"
          className="flex-1 rounded-lg px-4 py-2.5 text-sm placeholder:text-[#9090A0] focus:outline-none"
          style={{
            backgroundColor: '#ffffff',
            color: '#1A1A2E',
            border: '1px solid rgba(201,168,76,0.35)',
          }}
        />
        <button
          type="submit"
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-dark bg-gold hover:bg-gold/90 active:bg-gold/80 transition-colors tracking-wide"
        >
          Найти
        </button>
      </form>

      {/* Shelf container */}
      <div className="overflow-x-auto pb-1" style={{ margin: '0 -4px' }}>
        <div style={{ padding: '8px 4px 0', minWidth: 'max-content' }}>
          {/* Books row — items-end so books rest on the shelf; badge above each */}
          <div className="flex items-end gap-[10px]">
            {dicts.map((d) => (
              <BookCard key={d.slug} dict={d} />
            ))}
            <div style={{ width: 24, flexShrink: 0 }} />
          </div>

          {/* Shelf board */}
          <div className="shelf-board" />
          <div className="shelf-shadow" />
        </div>
      </div>

      {/* Decorative quote */}
      <div className="mt-14 text-center">
        <p className="text-xs italic text-cream/15 font-serif">
          «Свет от шестигранных ламп не затухает никогда»
        </p>
      </div>
    </div>
  );
}
