import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Вавилонская библиотека', template: '%s — Вавилонская библиотека' },
  description: 'Энциклопедический многоязычный словарь',
};

function HexPattern() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="hexGrid"
            x="0"
            y="0"
            width="104"
            height="90"
            patternUnits="userSpaceOnUse"
          >
            {/*
              Pointy-top hex grid, circumradius 30px.
              Tile: 104×90. Centers: row1=(26,30),(78,30); row2=(0,75),(52,75),(104,75).
              Partial hexes at tile edges complete seamlessly on repeat.
            */}
            <path
              d={[
                'M26,0 L52,15 52,45 26,60 0,45 0,15 Z',
                'M78,0 L104,15 104,45 78,60 52,45 52,15 Z',
                'M52,45 L78,60 78,90 52,105 26,90 26,60 Z',
                'M0,45 L26,60 26,90 0,105 -26,90 -26,60 Z',
                'M104,45 L130,60 130,90 104,105 78,90 78,60 Z',
              ].join(' ')}
              fill="none"
              stroke="#C9A84C"
              strokeWidth="0.75"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexGrid)" opacity="0.07" />
      </svg>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="min-h-screen flex flex-col bg-dark text-cream">

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="relative overflow-hidden" style={{ borderBottom: '1px solid rgba(201,168,76,0.12)' }}>
          <div className="absolute inset-0 bg-dark" />
          <HexPattern />

          <div className="relative z-10 max-w-5xl mx-auto px-6 py-7">
            <a href="/" className="block group">
              <div className="flex items-baseline gap-3">
                <span className="text-[10px] uppercase tracking-[0.4em] text-gold/50 font-sans">
                  Biblioteka
                </span>
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-widest uppercase text-cream group-hover:text-gold transition-colors duration-300">
                Вавилонская библиотека
              </h1>
              <p className="mt-2 text-sm italic text-gold/70 font-serif leading-relaxed max-w-xl">
                «Вселенная, которую другие называют Библиотекой, состоит из неопределённого,
                а возможно и бесконечного числа шестигранных галерей»
              </p>
              <p className="text-[11px] text-cream/30 mt-1 tracking-wider">
                — Хорхе Луис Борхес
              </p>
            </a>
          </div>
        </header>

        {/* ── Main ───────────────────────────────────────────────── */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
          {children}
        </main>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <footer
          className="text-center text-[11px] text-cream/20 py-5 tracking-widest uppercase"
          style={{ borderTop: '1px solid rgba(201,168,76,0.08)' }}
        >
          Omnis bibliotheca infinita est
        </footer>

      </body>
    </html>
  );
}
