import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentToken } from '@/lib/auth';
import { agentUpdateDraft } from '@/lib/store';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const draftSectionSchema = z.object({
  id: z.string(),
  sectionNum: z.number().optional(),
  title: z.string().min(1, 'Section title cannot be empty'),
  wordCount: z.number().optional(),
  maxWords: z.number().positive('maxWords must be greater than 0'),
  content: z.string(),
  unverifiedClaims: z.array(z.string()).optional(),
});

const postDraftSchema = z.object({
  agentName: z.string().optional().default('Drafter agent'),
  draft: z.array(draftSectionSchema).min(1, 'Draft sections cannot be empty'),
});

export async function POST(req: NextRequest) {
  const auth = verifyAgentToken(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = postDraftSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.errors },
        { status: 400 }
      );
    }

    const { agentName, draft } = result.data;
    const formattedDraft = draft.map((s, i) => {
      const words = s.content.trim().split(/\s+/).filter(Boolean).length;
      return {
        ...s,
        sectionNum: s.sectionNum ?? i + 1,
        wordCount: s.wordCount ?? words,
      };
    });

    const updatedState = await agentUpdateDraft(agentName, formattedDraft);
    return NextResponse.json({ success: true, state: updatedState });
  } catch (error) {
    console.error('Agent draft error:', error);
    return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
  }
}

