'use client';

import { useRouter } from 'next/navigation';
import type { Dictionary } from '@/lib/db';

const FIELD_LABELS: Record<string, string> = {
  GENERAL: 'Общие',
  BIO: 'Биология',
  MED: 'Медицина',
  GEO: 'География',
  AVIA: 'Авиация',
  CHEM: 'Химия',
  TECH: 'Технологии',
  ARTS: 'Искусство',
  AGRO: 'Агрономия',
  FIN: 'Финансы',
  OTHER: 'Прочее',
};

const FIELD_ORDER = ['GENERAL', 'BIO', 'MED', 'GEO', 'AVIA', 'CHEM', 'TECH', 'ARTS', 'AGRO', 'FIN', 'OTHER'];

export default function SearchFilters({
  dicts,
  selectedDictSlugs,
  query,
}: {
  dicts: Dictionary[];
  selectedDictSlugs: string[];
  query: string;
}) {
  const router = useRouter();
  const allSlugs = dicts.map((d) => d.slug);
  const allSelected = selectedDictSlugs.length === allSlugs.length;

  function navigate(newSelected: string[]) {
    const params = new URLSearchParams({ q: query });
    if (newSelected.length === 0) {
      params.set('dicts', 'none');
    } else if (newSelected.length < allSlugs.length) {
      params.set('dicts', newSelected.join(','));
    }
    router.push(`/search?${params.toString()}`);
  }

  function toggleDict(slug: string) {
    const next = selectedDictSlugs.includes(slug)
      ? selectedDictSlugs.filter((s) => s !== slug)
      : [...selectedDictSlugs, slug];
    navigate(next);
  }

  // Group dicts by field
  const byField: Record<string, Dictionary[]> = {};
  for (const d of dicts) {
    const key = d.field ?? 'OTHER';
    (byField[key] ??= []).push(d);
  }
  const fieldGroups = FIELD_ORDER.filter((f) => byField[f]).map((f) => ({
    field: f,
    label: FIELD_LABELS[f] ?? f,
    dicts: byField[f],
  }));

  return (
    <div
      className="rounded-lg p-4"
      style={{
        border: '1px solid rgba(201,168,76,0.15)',
        background: 'rgba(201,168,76,0.04)',
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-cream/40 mb-3">
        Словари
      </p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => navigate(allSlugs)}
          className="text-[10px] font-mono px-2 py-1 rounded transition-colors"
          style={{
            border: '1px solid rgba(201,168,76,0.3)',
            color: allSelected ? '#C9A84C' : 'rgba(232,224,204,0.5)',
            background: allSelected ? 'rgba(201,168,76,0.1)' : 'transparent',
          }}
        >
          Выбрать все
        </button>
        <button
          onClick={() => navigate([])}
          className="text-[10px] font-mono px-2 py-1 rounded transition-colors"
          style={{
            border: '1px solid rgba(201,168,76,0.3)',
            color: 'rgba(232,224,204,0.5)',
            background: 'transparent',
          }}
        >
          Снять все
        </button>
      </div>

      <div className="space-y-4">
        {fieldGroups.map(({ field, label, dicts: groupDicts }) => (
          <div key={field}>
            <p
              className="text-[9px] uppercase tracking-[0.3em] mb-2"
              style={{ color: 'rgba(201,168,76,0.45)' }}
            >
              {label}
            </p>
            <div className="space-y-1.5">
              {groupDicts.map((d) => {
                const checked = selectedDictSlugs.includes(d.slug);
                const displayName = d.name.replace(/\s*\([^)]*-[^)]*\)\s*$/, '');
                return (
                  <label
                    key={d.slug}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDict(d.slug)}
                      className="sr-only"
                    />
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        border: `1px solid ${checked ? d.color : 'rgba(201,168,76,0.3)'}`,
                        background: checked ? d.color + '44' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.15s',
                      }}
                    >
                      {checked && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path
                            d="M1 4L3 6L7 2"
                            stroke={d.color}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span
                      className="text-xs font-sans truncate"
                      style={{ color: checked ? '#E8E0CC' : 'rgba(232,224,204,0.45)' }}
                    >
                      {displayName}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
