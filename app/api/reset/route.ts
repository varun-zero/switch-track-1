import { NextResponse } from 'next/server';
import { resetState } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const freshState = await resetState();
    return NextResponse.json({ success: true, message: 'Demo data reset successfully', state: freshState });
  } catch (error) {
    console.error('Failed to reset state:', error);
    return NextResponse.json({ error: 'Failed to reset state' }, { status: 500 });
  }
}

