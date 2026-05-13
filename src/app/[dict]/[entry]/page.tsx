export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { getDictionary, getEntry } from '@/lib/db';

interface Props {
  params: { dict: string; entry: string };
}

export async function generateMetadata({ params }: Props) {
  const entry = getEntry(params.dict, params.entry);
  if (!entry) return {};
  const dict = getDictionary(params.dict);
  return { title: `${entry.title} — ${dict?.name ?? ''}` };
}

function renderBody(body: string) {
  const lines = body.split('\n').filter(Boolean);
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Alt headwords: "= word1; word2"
    if (line.startsWith('= ')) {
      elements.push(
        <p key={i} className="text-sm font-sans italic mb-3" style={{ color: '#8A7D5A' }}>
          Тж.: {line.slice(2)}
        </p>,
      );
      continue;
    }

    // Short POS / category label (all-Cyrillic, short, no spaces)
    const isCyrillicLabel =
      /^[а-яёА-ЯЁ][а-яёА-ЯЁ\s]{0,18}$/.test(line) && line.length <= 20 && line.split(' ').length <= 2;
    if (isCyrillicLabel) {
      elements.push(
        <span
          key={i}
          className="inline-block text-[11px] font-sans font-semibold uppercase tracking-widest rounded px-2 py-0.5 mr-1 mb-2"
          style={{ color: '#7A6030', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.25)' }}
        >
          {line}
        </span>,
      );
      continue;
    }

    // Regular body line
    elements.push(
      <p key={i} className="mb-3 last:mb-0 body-serif" style={{ color: '#2D2A22' }}>
        {line}
      </p>,
    );
  }

  return <>{elements}</>;
}

export default function EntryPage({ params }: Props) {
  const dict = getDictionary(params.dict);
  if (!dict) notFound();

  const entry = getEntry(params.dict, params.entry);
  if (!entry) notFound();

  return (
    <div className="max-w-3xl mx-auto">

      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-2 text-[12px] text-cream/35 font-sans">
        <a href="/" className="hover:text-gold transition-colors">Библиотека</a>
        <span className="text-cream/15">›</span>
        <a href={`/${dict.slug}`} className="hover:text-gold transition-colors">{dict.name}</a>
        <span className="text-cream/15">›</span>
        <span className="text-cream/55">{entry.title}</span>
      </nav>

      {/* Entry card */}
      <article className="card-parchment">

        {/* Title block */}
        <header
          className="px-8 py-7"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.18)' }}
        >
          {/* Dict tag */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dict.color }} />
            <span className="text-[10px] font-sans uppercase tracking-[0.3em] text-ink/40">
              {dict.name}
            </span>
          </div>

          {/* Headword */}
          <h1 className="font-serif text-4xl leading-tight text-ink font-normal">
            {entry.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-3">
            <span
              className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded"
              style={{ color: dict.color, background: dict.color + '18', border: `1px solid ${dict.color}44` }}
            >
              {dict.language}
            </span>
            <span className="text-[12px] font-mono text-ink/30">{entry.letter}</span>
          </div>
        </header>

        {/* Body */}
        <div className="px-8 py-7">
          {entry.body ? (
            renderBody(entry.body)
          ) : (
            <p className="body-serif italic" style={{ color: '#8A7D5A' }}>
              Нет определения
            </p>
          )}
        </div>
      </article>

      {/* Back link */}
      <div className="mt-7 flex items-center justify-between">
        <a
          href={`/${dict.slug}?letter=${entry.letter}`}
          className="text-[12px] text-cream/35 hover:text-gold transition-colors font-sans"
        >
          ← Все статьи на «{entry.letter}»
        </a>
        <a
          href={`/${dict.slug}`}
          className="text-[12px] text-cream/35 hover:text-gold transition-colors font-sans"
        >
          ← К словарю
        </a>
      </div>

    </div>
  );
}
