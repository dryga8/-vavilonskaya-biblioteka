'use client';

import { useState } from 'react';
import { type Dictionary } from '@/lib/db';
import { ReliabilityBadge } from '@/components/ReliabilityBadge';
import { FIELD_COLORS } from '@/lib/fieldColors';

const CATEGORIES = [
  { key: 'ALL',     label: 'Все' },
  { key: 'GENERAL', label: 'General' },
  { key: 'BIO',     label: 'Bio' },
  { key: 'MED',     label: 'Med' },
  { key: 'GEO',     label: 'Geo' },
  { key: 'AVIA',    label: 'Avia' },
  { key: 'TECH',    label: 'Tech' },
  { key: 'CHEM',    label: 'Chem' },
  { key: 'ARTS',    label: 'Arts' },
  { key: 'AGRO',    label: 'Agro' },
  { key: 'OTHER',   label: 'Other' },
];

const KNOWN_FIELDS = new Set(['GENERAL', 'BIO', 'MED', 'GEO', 'AVIA', 'TECH', 'CHEM', 'ARTS', 'AGRO']);

function effectiveField(dict: Dictionary): string {
  const f = dict.field?.toUpperCase();
  if (f && KNOWN_FIELDS.has(f)) return f;
  return 'OTHER';
}

function DictCard({ dict }: { dict: Dictionary }) {
  const stripColor = FIELD_COLORS[effectiveField(dict)] ?? '#4a4a6a';
  return (
    <a href={`/${dict.slug}`} className="dict-card" title={dict.name}>
      <div className="dict-card-strip" style={{ background: stripColor }} />
      <div className="dict-card-body">
        <div className="dict-card-top">
          <div style={{ minWidth: 0 }}>
            <div className="dict-card-name">{dict.name}</div>
            <div className="dict-card-field">{effectiveField(dict)}</div>
          </div>
          {dict.reliability && (
            <div style={{ flexShrink: 0 }}>
              <ReliabilityBadge reliability={dict.reliability} />
            </div>
          )}
        </div>
        <p className="dict-card-desc">{dict.description}</p>
        <div className="dict-card-count">
          {dict.entry_count.toLocaleString('ru-RU')} статей
        </div>
      </div>
    </a>
  );
}

export function DictionaryGrid({ dicts }: { dicts: Dictionary[] }) {
  const [active, setActive] = useState('ALL');

  const filtered =
    active === 'ALL' ? dicts : dicts.filter((d) => effectiveField(d) === active);

  return (
    <div>
      {/* Category filter pills */}
      <div className="dict-filters">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActive(cat.key)}
            className={`dict-pill${active === cat.key ? ' dict-pill-active' : ''}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Card grid */}
      <div className="dict-grid">
        {filtered.map((d) => (
          <DictCard key={d.slug} dict={d} />
        ))}
      </div>
    </div>
  );
}
