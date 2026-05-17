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
  reliable,
}: {
  dicts: Dictionary[];
  selectedDictSlugs: string[];
  query: string;
  reliable: boolean;
}) {
  const router = useRouter();
  const allSlugs = dicts.map((d) => d.slug);
  const approvedSlugs = dicts.filter((d) => d.reliability === 'approved').map((d) => d.slug);
  const allSelected = selectedDictSlugs.length === allSlugs.length;

  function navigate(newSelected: string[], nextReliable = reliable) {
    const params = new URLSearchParams({ q: query });
    if (newSelected.length === 0) {
      params.set('dicts', 'none');
    } else if (newSelected.length < allSlugs.length) {
      params.set('dicts', newSelected.join(','));
    }
    if (nextReliable) params.set('reliable', '1');
    router.push(`/search?${params.toString()}`);
  }

  function toggleDict(slug: string) {
    const next = selectedDictSlugs.includes(slug)
      ? selectedDictSlugs.filter((s) => s !== slug)
      : [...selectedDictSlugs, slug];
    navigate(next);
  }

  function toggleReliable() {
    const nextReliable = !reliable;
    navigate(selectedDictSlugs, nextReliable);
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
      {/* Reliable-only toggle */}
      <label
        className="flex items-center gap-2 cursor-pointer mb-4 pb-3"
        style={{ borderBottom: '1px solid rgba(201,168,76,0.12)' }}
      >
        <input
          type="checkbox"
          checked={reliable}
          onChange={toggleReliable}
          className="sr-only"
        />
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 3,
            border: `1px solid ${reliable ? '#C9A84C' : 'rgba(201,168,76,0.4)'}`,
            background: reliable ? 'rgba(201,168,76,0.2)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
        >
          {reliable && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path
                d="M1 4L3 6L7 2"
                stroke="#C9A84C"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <span className="text-[11px] font-sans" style={{ color: reliable ? '#E8E0CC' : 'rgba(232,224,204,0.6)' }}>
          Только проверенные
        </span>
        <span
          style={{
            fontSize: 9,
            fontFamily: 'monospace',
            background: '#1a4a1a',
            color: '#4ade80',
            border: '1px solid #22c55e',
            borderRadius: 3,
            padding: '1px 5px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          ✓ Верим
        </span>
      </label>

      <p className="text-[10px] uppercase tracking-[0.3em] text-cream/40 mb-3">
        Словари
      </p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => navigate(reliable ? approvedSlugs : allSlugs)}
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
                const isApproved = d.reliability === 'approved';
                const disabled = reliable && !isApproved;
                const displayName = d.name.replace(/\s*\([^)]*-[^)]*\)\s*$/, '');
                return (
                  <label
                    key={d.slug}
                    className="flex items-center gap-2 group"
                    style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1 }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => !disabled && toggleDict(d.slug)}
                      disabled={disabled}
                      className="sr-only"
                    />
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        border: `1px solid ${checked && !disabled ? d.color : 'rgba(201,168,76,0.3)'}`,
                        background: checked && !disabled ? d.color + '44' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.15s',
                      }}
                    >
                      {checked && !disabled && (
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
                      style={{ color: checked && !disabled ? '#E8E0CC' : 'rgba(232,224,204,0.45)' }}
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
