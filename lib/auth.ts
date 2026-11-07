import { NextRequest } from 'next/server';

export function verifyAgentToken(req: NextRequest): { authorized: boolean; error?: string } {
  const expectedToken = process.env.SIGNOFF_AGENT_TOKEN || 'switch-agent-secret-token';
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return { authorized: false, error: 'Missing Authorization header. Expected Bearer token.' };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return { authorized: false, error: 'Invalid Authorization format. Expected: Bearer <token>' };
  }

  const token = parts[1];
  if (token !== expectedToken) {
    return { authorized: false, error: 'Invalid agent token.' };
  }

  return { authorized: true };
}

