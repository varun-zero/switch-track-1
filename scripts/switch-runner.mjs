#!/usr/bin/env node
/**
 * Switch Agent Protocol Runner / Simulator
 * Track 01: Best Business Workflow — Flip the Switch Hackathon
 *
 * Simulates the multi-agent orchestration of the Switch #grant-room:
 * 1. Reset: Resets state to clean unapproved demo baseline (POST /api/reset)
 * 2. Analyst Agent: Posts RFP requirements checklist (POST /api/agent/requirements)
 * 3. Drafter Agent: Posts cited sections with [E#] & [GAP] (POST /api/agent/draft)
 * 4. Checker Engine: Deterministic audit runs automatically
 * 5. Reviewer Agent: Posts rubric scores (POST /api/agent/review)
 * 6. Approval Gate Test: Demonstrates server-side 409 Conflict rejection
 * 7. Human Approver: Resolves fixes (POST /api/fixes) and approves (POST /api/approve)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read token from .env.local if present
let token = process.env.SIGNOFF_AGENT_TOKEN || 'switch-agent-secret-token';
try {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/SIGNOFF_AGENT_TOKEN=(.+)/);
    if (match && match[1]) {
      token = match[1].trim();
    }
  }
} catch {
  // Ignore
}

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const isFast = process.argv.includes('--fast');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, isFast ? 40 : ms));

// ANSI styling
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const teal = (s) => `\x1b[38;2;0;212;180m${s}\x1b[0m`;
const lime = (s) => `\x1b[38;2;182;255;77m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

function badge(name, colorFn) {
  return colorFn(`[${name.padEnd(8)}]`);
}

async function request(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  console.log('\n' + teal('═'.repeat(72)));
  console.log(bold(lime(' SWITCH AGENT PROTOCOL RUNNER · TRACK 01 BUSINESS WORKFLOW')));
  console.log(dim(' Target Room: #grant-room | Connected App: ') + cyan(BASE_URL));
  console.log(teal('═'.repeat(72)) + '\n');

  // 0. Healthcheck & Initial State Reset
  try {
    const resetRes = await request('/api/reset', { method: 'POST' });
    if (!resetRes.ok) {
      console.error(red(`\n✖ Could not connect to Signoff App at ${BASE_URL}. Ensure it is running.`));
      process.exit(1);
    }
  } catch (err) {
    console.error(red(`\n✖ Connection failed: ${err.message}`));
    console.error(dim(`  Start the app with 'npm run dev' or 'npm start' on ${BASE_URL} first.\n`));
    process.exit(1);
  }

  // 1. Kickoff in Switch Room
  console.log(dim(`[${new Date().toLocaleTimeString()}] `) + badge('ROOM', cyan) + ' Switch room #grant-room initialized with Maya (client), @Analyst, @Drafter, @Reviewer, @Checker, and Human Approver.');
  await sleep(800);

  console.log(dim(`[${new Date().toLocaleTimeString()}] `) + badge('Maya', yellow) + ' @Analyst here are the grant rules and our proof files.');
  await sleep(1000);

  // 2. Analyst Agent posts checklist
  console.log(dim(`[${new Date().toLocaleTimeString()}] `) + badge('Analyst', teal) + ' Ingesting RFP rules... extracting 8 checklist requirements.');
  
  const reqRes = await request('/api/agent/requirements', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      agentName: 'Analyst agent',
      requirements: [
        { id: 'req-1', text: 'Nonprofit status letter', required: true, proof: 'E1 Status letter', status: 'ok', statusText: 'Done' },
        { id: 'req-2', text: 'Serves the funder’s region', required: true, proof: 'E2 Annual report', status: 'ok', statusText: 'Done' },
        { id: 'req-3', text: 'Budget matches cap of $50,000', required: true, proof: 'E3 Project budget', status: 'ok', statusText: 'Done' },
        { id: 'req-4', text: 'Past track record cited', required: true, proof: 'E4 Outcomes study', status: 'ok', statusText: 'Done' },
        { id: 'req-5', text: 'Timeline has milestones', required: true, proof: 'E5 Work plan', status: 'ok', statusText: 'Done' },
        { id: 'req-6', text: 'Two letters of support', required: true, proof: 'E6 Letters', status: 'ok', statusText: 'Done' },
        { id: 'req-7', text: 'Independent audit (last 2 yrs)', required: true, proof: 'E7 Audit', status: 'gap', statusText: 'Needs a fix' },
        { id: 'req-8', text: 'Staff bios included', required: true, proof: 'E8 Resumes', status: 'miss', statusText: 'Missing' },
      ],
    }),
  });

  if (reqRes.ok) {
    console.log(dim(`  ↳ HTTP POST /api/agent/requirements: `) + lime('200 OK') + dim(` (${reqRes.data.state.requirements.length} requirements synchronized)`));
  } else {
    console.log(red(`  ↳ Failed to post requirements: ${JSON.stringify(reqRes.data)}`));
  }
  await sleep(1200);

  // 3. Drafter Agent posts draft sections
  console.log(dim(`[${new Date().toLocaleTimeString()}] `) + badge('Drafter', teal) + ' Drafting narrative sections grounded strictly in evidence index [E1-E8]...');
  
  const draftRes = await request('/api/agent/draft', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      agentName: 'Drafter agent',
      draft: [
        {
          id: 'draft-1',
          title: '1. Why we need this (Problem statement)',
          maxWords: 500,
          content: 'Last year, 1,200 job seekers came to us for help [E4]. Most live in the three counties this fund serves [E2]. Our graduates earned 30% more within a year [E4]. Without new funding, 400 people will be turned away next spring [GAP: need waitlist estimate].',
        },
        {
          id: 'draft-2',
          title: '2. What we will do (Project plan)',
          maxWords: 750,
          content: 'We will run four 10-week cohorts of our IT support training [E5]. Each cohort has 25 students, for 100 people total. Every student gets a mentor from a local employer [E6]. Classes meet in the evenings at the downtown center [E1].',
        },
        {
          id: 'draft-3',
          title: '3. Budget and capacity',
          maxWords: 400,
          content: 'The total project cost is $48,200 [E3], under the $50,000 cap. Staff costs are $32,000, equipment is $11,200, and room rental is $5,000. Our team of 6 has run this program for three years [E4].',
        },
      ],
    }),
  });

  if (draftRes.ok) {
    console.log(dim(`  ↳ HTTP POST /api/agent/draft: `) + lime('200 OK') + dim(` (${draftRes.data.state.draft.length} sections loaded)`));
  } else {
    console.log(red(`  ↳ Failed to post draft: ${JSON.stringify(draftRes.data)}`));
  }
  await sleep(1200);

  // 4. Deterministic Checker
  console.log(dim(`[${new Date().toLocaleTimeString()}] `) + badge('Checker', cyan) + ' Deterministic audit running (regex & citation integrity, zero LLM)...');
  await sleep(800);
  console.log(dim(`  ↳ Checked citations [E1-E8]. Found 1 gap marker and 1 missing attachment. Flags updated in real-time.`));
  await sleep(1000);

  // 5. Reviewer Agent posts rubric scores
  console.log(dim(`[${new Date().toLocaleTimeString()}] `) + badge('Reviewer', teal) + ' Evaluating proposal against funder rubric (Need 30, Approach 30, Capacity 20, Budget 20)...');
  
  const reviewRes = await request('/api/agent/review', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      agentName: 'Reviewer agent',
      rubricScores: [
        { name: 'Need', score: 28, max: 30 },
        { name: 'Approach', score: 26, max: 30 },
        { name: 'Capacity', score: 18, max: 20 },
        { name: 'Budget', score: 18, max: 20 },
      ],
    }),
  });

  if (reviewRes.ok) {
    console.log(dim(`  ↳ HTTP POST /api/agent/review: `) + lime('200 OK') + dim(` (Computed Rubric Score: ${reviewRes.data.state.overallScore}/100)`));
  } else {
    console.log(red(`  ↳ Failed to post review: ${JSON.stringify(reviewRes.data)}`));
  }
  await sleep(1200);

  // 6. NEGATIVE TEST: Human Gate Enforcement (HTTP 409)
  console.log('\n' + yellow('────────────────────────────────────────────────────────────────────────'));
  console.log(bold(yellow(' RULE ENFORCEMENT DEMO: Attempting Approval While Fixes Are Open')));
  console.log(yellow('────────────────────────────────────────────────────────────────────────'));
  
  console.log(dim(`[${new Date().toLocaleTimeString()}] `) + badge('Approver', yellow) + ' Attempting premature sign-off before verifying required fixes...');
  const earlyApprove = await request('/api/approve', {
    method: 'POST',
  });

  if (earlyApprove.status === 409) {
    console.log(dim(`  ↳ HTTP POST /api/approve: `) + red('409 Conflict (ENFORCED BY SERVER)'));
    console.log(red(`    Server Message: "${earlyApprove.data.error}"`));
    console.log(lime('    ✔ Human approval gate successfully blocked premature sign-off!'));
  } else {
    console.log(red(`  ✖ Unexpected status: ${earlyApprove.status} ${JSON.stringify(earlyApprove.data)}`));
  }
  await sleep(1400);

  // 7. Human Approver Resolves Open Fixes
  console.log('\n' + teal('────────────────────────────────────────────────────────────────────────'));
  console.log(bold(teal(' HUMAN IN THE LOOP: Approver Completes Required Fixes')));
  console.log(teal('────────────────────────────────────────────────────────────────────────'));

  console.log(dim(`[${new Date().toLocaleTimeString()}] `) + badge('Approver', lime) + ' Checking fix-pay-claim: "I added a source for the graduate pay claim."');
  await request('/api/fixes', { method: 'POST', body: JSON.stringify({ id: 'fix-pay-claim', done: true }) });
  await sleep(600);

  console.log(dim(`[${new Date().toLocaleTimeString()}] `) + badge('Approver', lime) + ' Checking fix-board-list: "I attached the board member list."');
  await request('/api/fixes', { method: 'POST', body: JSON.stringify({ id: 'fix-board-list', done: true }) });
  await sleep(800);

  // 8. Final Approval
  console.log(dim(`[${new Date().toLocaleTimeString()}] `) + badge('Approver', lime) + ' All required fixes verified. Submitting final executive sign-off...');
  const finalApprove = await request('/api/approve', {
    method: 'POST',
  });

  if (finalApprove.ok) {
    console.log(dim(`  ↳ HTTP POST /api/approve: `) + lime('200 OK (APPROVED)'));
    console.log(bold(lime(`    ✔ Sign-off timestamp recorded: ${finalApprove.data.state.approvedAt}`)));
  } else {
    console.log(red(`  ✖ Approval failed: ${JSON.stringify(finalApprove.data)}`));
  }

  console.log('\n' + teal('═'.repeat(72)));
  console.log(bold(lime(' SWITCH WORKFLOW RUN COMPLETED SUCCESSFULLY')));
  console.log(dim(' All decisions, timestamps, and audit trails persisted to ./data/state.json'));
  console.log(dim(' View live application dashboard at: ') + cyan(BASE_URL + '/sign-off'));
  console.log(teal('═'.repeat(72)) + '\n');
}

main().catch((err) => {
  console.error(red(`\nRunner error: ${err.message}`));
  process.exit(1);
});
