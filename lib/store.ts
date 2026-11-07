import fs from 'fs';
import path from 'path';
import { AppState, DecisionLogEntry, DraftSection, FixItem, RequirementItem, RubricCategory } from '@/types';
import { canApprove, runChecker } from './checker';

const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

const INITIAL_STATE: AppState = {
  approved: false,
  approvedAt: null,
  evidence: [
    { id: 'E1', title: 'Status letter', description: 'Nonprofit 501(c)(3) determination letter' },
    { id: 'E2', title: 'Annual report', description: 'Regional service area demographics and coverage report' },
    { id: 'E3', title: 'Employer partnerships', description: 'Course agreements with local employers' },
    { id: 'E4', title: 'Results file', description: 'Annual intake data: 1,200 job seekers' },
    { id: 'E5', title: 'Budget sheet', description: 'Detailed grant project budget with 12% overhead' },
    { id: 'E6', title: 'Staffing roster', description: 'Current program team and qualifications' },
    { id: 'E7', title: 'Sponsor’s audit', description: 'Audited financial report from fiscal sponsor' },
    { id: 'E8', title: 'Letters', description: 'Two letters of support from community partners' },
  ],
  requirements: [
    { id: 'req-1', num: 1, text: 'Nonprofit status letter', required: true, proof: 'E1 Status letter', status: 'ok', statusText: 'Done', evidenceKey: 'E1' },
    { id: 'req-2', num: 2, text: 'Serves the funder’s region', required: true, proof: 'E2 Annual report', status: 'ok', statusText: 'Done', evidenceKey: 'E2' },
    { id: 'req-3', num: 3, text: 'Audited financial report', required: true, proof: 'E7 Sponsor’s audit (you chose this)', status: 'ok', statusText: 'Done', evidenceKey: 'E7' },
    { id: 'req-4', num: 4, text: 'Project summary, 2 pages', required: true, proof: 'Draft, section 1', status: 'ok', statusText: 'Done', evidenceKey: null },
    { id: 'req-5', num: 5, text: 'Results from last year', required: true, proof: 'E4 Results file, one number has no source', status: 'gap', statusText: 'Needs a fix', evidenceKey: 'E4' },
    { id: 'req-6', num: 6, text: 'Budget, overhead under 15%', required: true, proof: 'E5 Budget sheet', status: 'ok', statusText: 'Done', evidenceKey: 'E5' },
    { id: 'req-7', num: 7, text: 'Two letters of support', required: false, proof: 'E8 Letters', status: 'ok', statusText: 'Done', evidenceKey: 'E8' },
    { id: 'req-8', num: 8, text: 'List of board members', required: true, proof: 'Not attached', status: 'miss', statusText: 'Missing', evidenceKey: null },
  ],
  draft: [
    {
      id: 'draft-1',
      sectionNum: 1,
      title: 'Why we need this',
      wordCount: 410,
      maxWords: 500,
      content: 'Last year, 1,200 job seekers came to us for help [E4]. Most live in the three counties this fund serves [E2]. Our graduates earned 30% more within a year.',
      unverifiedClaims: ['Our graduates earned 30% more within a year.'],
    },
    {
      id: 'draft-2',
      sectionNum: 2,
      title: 'Our plan',
      wordCount: 470,
      maxWords: 500,
      content: 'We run 12-week courses with local employers [E3]. We work with GAP: number of employer partners companies. Every student gets a coach.',
    },
    {
      id: 'draft-3',
      sectionNum: 3,
      title: 'Our team',
      wordCount: 260,
      maxWords: 300,
      content: 'Nine staff run the program [E6]. Our fiscal sponsor audits the accounts every year [E7].',
    },
  ],
  rubricScores: [
    { name: 'Need', score: 24, max: 30 },
    { name: 'Approach', score: 23, max: 30 },
    { name: 'Capacity', score: 16, max: 20 },
    { name: 'Budget', score: 15, max: 20 },
  ],
  overallScore: 78,
  problems: [
    'One claim about graduate pay has no source.',
    'The board member list is not attached.',
    'Two spots still say GAP.',
  ],
  fixes: [
    { id: 'fix-pay-claim', text: 'I added a source for the graduate pay claim.', done: false },
    { id: 'fix-board-list', text: 'I attached the board member list.', done: false },
  ],
  attachments: {
    board_members: false,
  },
  decisionLog: [
    {
      actor: 'Analyst agent',
      action: 'Found a problem: audited financials are required, but only a sponsor letter was uploaded.',
      timestamp: 'Nov 4, 10:12',
    },
    {
      actor: 'You (Approver)',
      action: 'Decided to use the fiscal sponsor’s audit (E7).',
      timestamp: 'Nov 4, 10:20',
    },
    {
      actor: 'Reviewer agent',
      action: 'Scored the draft 78 out of 100. Found 2 problems.',
      timestamp: 'Nov 4, 11:05',
    },
  ],
};

function formatTimestamp(): string {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${month} ${day}, ${hours}:${mins}`;
}

type StateListener = (state: AppState) => void;
const listeners = new Set<StateListener>();

export function subscribeToState(listener: StateListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(state: AppState) {
  for (const listener of listeners) {
    try {
      listener(state);
    } catch (e) {
      console.error('Error notifying state listener:', e);
    }
  }
}

export async function readState(): Promise<AppState> {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let state: AppState;
  if (!fs.existsSync(STATE_FILE)) {
    state = JSON.parse(JSON.stringify(INITIAL_STATE));
    await writeState(state);
  } else {
    try {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      state = JSON.parse(data);
    } catch {
      state = JSON.parse(JSON.stringify(INITIAL_STATE));
      await writeState(state);
    }
  }

  // Recalculate dynamic values via checker
  const checker = runChecker({
    evidence: state.evidence,
    requirements: state.requirements,
    draft: state.draft,
    fixes: state.fixes,
    attachments: state.attachments,
    customRubricScores: state.rubricScores,
  });

  state.requirements = checker.requirements;
  state.problems = checker.problems;
  state.rubricScores = checker.rubricScores;
  state.overallScore = checker.overallScore;

  return state;
}

export async function writeState(state: AppState): Promise<void> {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Re-run checker before persisting
  const checker = runChecker({
    evidence: state.evidence,
    requirements: state.requirements,
    draft: state.draft,
    fixes: state.fixes,
    attachments: state.attachments,
    customRubricScores: state.rubricScores,
  });

  state.requirements = checker.requirements;
  state.problems = checker.problems;
  state.rubricScores = checker.rubricScores;
  state.overallScore = checker.overallScore;

  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  notifyListeners(state);
}

export async function resetState(): Promise<AppState> {
  const fresh = JSON.parse(JSON.stringify(INITIAL_STATE));
  await writeState(fresh);
  return fresh;
}

export async function updateFix(id: string, done: boolean): Promise<AppState> {
  const state = await readState();
  let fixFound = false;

  state.fixes = state.fixes.map((f) => {
    if (f.id === id || (id === '0' && f.id === 'fix-pay-claim') || (id === '1' && f.id === 'fix-board-list')) {
      fixFound = true;
      return { ...f, done };
    }
    return f;
  });

  if (!fixFound) {
    state.fixes.push({ id, text: id, done });
  }

  // Update attachments if board members fix was toggled
  if (id === 'fix-board-list' || id === '1') {
    state.attachments.board_members = done;
  }

  // Log the action
  const fixName =
    id === 'fix-pay-claim' || id === '0'
      ? 'graduate pay claim source'
      : id === 'fix-board-list' || id === '1'
        ? 'board member list attachment'
        : id;

  const logEntry: DecisionLogEntry = {
    actor: 'You (Approver)',
    action: done ? `Resolved fix: ${fixName}.` : `Reopened fix: ${fixName}.`,
    timestamp: formatTimestamp(),
  };

  state.decisionLog.push(logEntry);
  await writeState(state);
  return state;
}

export async function approve(): Promise<{ success: boolean; state?: AppState; error?: string }> {
  const state = await readState();

  if (state.approved) {
    return { success: true, state };
  }

  const check = canApprove(state);
  if (!check.allowed) {
    return { success: false, error: check.reason || 'Fix both problems first.' };
  }

  state.approved = true;
  state.approvedAt = new Date().toISOString();

  const logEntry: DecisionLogEntry = {
    actor: 'You (Approver)',
    action: 'Approved the application. Final file saved.',
    timestamp: formatTimestamp(),
  };

  state.decisionLog.push(logEntry);
  await writeState(state);

  return { success: true, state };
}

export async function agentUpdateRequirements(agentName: string, requirements: RequirementItem[]): Promise<AppState> {
  const state = await readState();
  state.requirements = requirements;

  state.decisionLog.push({
    actor: agentName || 'Analyst agent',
    action: `Updated checklist requirements (${requirements.length} items).`,
    timestamp: formatTimestamp(),
  });

  await writeState(state);
  return state;
}

export async function agentUpdateDraft(agentName: string, draft: DraftSection[]): Promise<AppState> {
  const state = await readState();
  state.draft = draft;

  state.decisionLog.push({
    actor: agentName || 'Drafter agent',
    action: `Updated draft (${draft.length} sections).`,
    timestamp: formatTimestamp(),
  });

  await writeState(state);
  return state;
}

export async function agentUpdateReview(
  agentName: string,
  scores: RubricCategory[]
): Promise<AppState> {
  const state = await readState();
  state.rubricScores = scores;

  const total = scores.reduce((sum, s) => sum + s.score, 0);

  state.decisionLog.push({
    actor: agentName || 'Reviewer agent',
    action: `Scored the draft ${total} out of 100.`,
    timestamp: formatTimestamp(),
  });

  await writeState(state);
  return state;
}

