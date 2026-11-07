import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentToken } from '@/lib/auth';
import { agentUpdateRequirements } from '@/lib/store';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const requirementItemSchema = z.object({
  id: z.string(),
  num: z.number().optional(),
  text: z.string().min(1, 'Requirement text cannot be empty'),
  required: z.boolean(),
  proof: z.string(),
  status: z.enum(['ok', 'gap', 'miss']).optional().default('ok'),
  statusText: z.string().optional().default('Done'),
  evidenceKey: z.string().nullable().optional(),
});

const postRequirementsSchema = z.object({
  agentName: z.string().optional().default('Analyst agent'),
  requirements: z.array(requirementItemSchema).min(1, 'Requirements list cannot be empty'),
});

export async function POST(req: NextRequest) {
  const auth = verifyAgentToken(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = postRequirementsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.errors },
        { status: 400 }
      );
    }

    const { agentName, requirements } = result.data;
    const formattedReqs = requirements.map((r, i) => ({
      ...r,
      num: r.num ?? i + 1,
    }));

    const updatedState = await agentUpdateRequirements(agentName, formattedReqs);
    return NextResponse.json({ success: true, state: updatedState });
  } catch (error) {
    console.error('Agent requirements error:', error);
    return NextResponse.json({ error: 'Failed to update requirements' }, { status: 500 });
  }
}

