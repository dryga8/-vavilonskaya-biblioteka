export const dynamic = 'force-dynamic';

import { getDictionaries, isDatabaseAvailable } from '@/lib/db';
import { DictionaryGrid } from '@/components/DictionaryGrid';

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

      <DictionaryGrid dicts={dicts} />
    </div>
  );
}
