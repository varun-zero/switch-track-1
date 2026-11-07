import { NextRequest, NextResponse } from 'next/server';
import { updateFix } from '@/lib/store';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const fixSchema = z.object({
  id: z.string(),
  done: z.boolean(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = fixSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: result.error.errors },
        { status: 400 }
      );
    }

    const { id, done } = result.data;
    const updatedState = await updateFix(id, done);

    return NextResponse.json({ success: true, state: updatedState });
  } catch (error) {
    console.error('Failed to update fix:', error);
    return NextResponse.json({ error: 'Failed to update fix' }, { status: 500 });
  }
}

