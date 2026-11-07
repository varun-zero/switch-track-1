import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentToken } from '@/lib/auth';
import { agentUpdateReview } from '@/lib/store';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const rubricScoreSchema = z.object({
  name: z.string().min(1, 'Category name required'),
  score: z.number().min(0, 'Score cannot be negative'),
  max: z.number().positive('Max score must be greater than 0'),
});

const postReviewSchema = z.object({
  agentName: z.string().optional().default('Reviewer agent'),
  rubricScores: z.array(rubricScoreSchema).min(1, 'Scores list cannot be empty'),
});

export async function POST(req: NextRequest) {
  const auth = verifyAgentToken(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = postReviewSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.errors },
        { status: 400 }
      );
    }

    const { agentName, rubricScores } = result.data;
    const updatedState = await agentUpdateReview(agentName, rubricScores);
    return NextResponse.json({ success: true, state: updatedState });
  } catch (error) {
    console.error('Agent review error:', error);
    return NextResponse.json({ error: 'Failed to update review scores' }, { status: 500 });
  }
}

