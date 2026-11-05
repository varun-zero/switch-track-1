import { NextResponse } from 'next/server';
import { approve } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await approve();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Fix both problems first.' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Approved. Final file saved.',
      state: result.state,
    });
  } catch (error) {
    console.error('Failed to approve application:', error);
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 });
  }
}

