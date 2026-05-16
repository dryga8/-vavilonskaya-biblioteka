'use client';

import { useRouter } from 'next/navigation';
import { useState, FormEvent } from 'react';

export default function SearchPageBox({
  defaultValue,
  selectedDicts,
}: {
  defaultValue: string;
  selectedDicts: string[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    const params = new URLSearchParams({ q });
    if (selectedDicts.length > 0) {
      params.set('dicts', selectedDicts.join(','));
    }
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Поиск по всем словарям…"
        autoFocus
        className="flex-1 rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-colors placeholder:text-[#9090A0]"
        style={{
          backgroundColor: '#ffffff',
          color: '#1A1A2E',
          border: '1px solid rgba(201,168,76,0.35)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(201,168,76,0.7)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.12)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(201,168,76,0.35)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      <button
        type="submit"
        className="rounded-lg px-5 py-2.5 text-sm font-semibold text-dark bg-gold hover:bg-gold/90 active:bg-gold/80 transition-colors tracking-wide"
      >
        Найти
      </button>
    </form>
  );
}
