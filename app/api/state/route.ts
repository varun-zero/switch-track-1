import { NextResponse } from 'next/server';
import { readState } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = await readState();
    return NextResponse.json(state);
  } catch (error) {
    console.error('Failed to get state:', error);
    return NextResponse.json({ error: 'Failed to retrieve state' }, { status: 500 });
  }
}

