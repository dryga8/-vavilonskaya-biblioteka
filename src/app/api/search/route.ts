import { NextRequest, NextResponse } from 'next/server';
import { globalSearch, getDictionaries } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').trim();
    const dicts = searchParams.get('dicts');
    const reliable = searchParams.get('reliable') === '1';

    const allDicts = getDictionaries();

    let dictSlugs = dicts ? dicts.split(',').filter(Boolean) : undefined;

    if (reliable) {
      const approvedSlugs = new Set(
        allDicts.filter((d) => d.reliability === 'approved').map((d) => d.slug),
      );
      dictSlugs = dictSlugs
        ? dictSlugs.filter((s) => approvedSlugs.has(s))
        : Array.from(approvedSlugs);
    }

    const groups = q ? globalSearch(q, dictSlugs) : [];

    return NextResponse.json({ groups, dicts: allDicts });
  } catch {
    return NextResponse.json({ groups: [], dicts: [] });
  }
}
