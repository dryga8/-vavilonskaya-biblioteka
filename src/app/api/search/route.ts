import { NextRequest, NextResponse } from 'next/server';
import { globalSearch, getDictionaries } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').trim();
    const dicts = searchParams.get('dicts');
    const dictSlugs = dicts ? dicts.split(',').filter(Boolean) : undefined;

    const allDicts = getDictionaries();
    const groups = q ? globalSearch(q, dictSlugs) : [];

    return NextResponse.json({ groups, dicts: allDicts });
  } catch {
    return NextResponse.json({ groups: [], dicts: [] });
  }
}
