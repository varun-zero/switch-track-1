import { describe, it, expect } from 'vitest';
import { runChecker, canApprove } from './checker';
import { AppState, DraftSection, EvidenceItem, FixItem, RequirementItem } from '@/types';

describe('Signoff Checker and Approval Rules', () => {
  const sampleEvidence: EvidenceItem[] = [
    { id: 'E1', title: 'Status letter' },
    { id: 'E2', title: 'Annual report' },
    { id: 'E3', title: 'Employer partnerships' },
    { id: 'E4', title: 'Results file' },
    { id: 'E5', title: 'Budget sheet' },
    { id: 'E6', title: 'Staffing roster' },
    { id: 'E7', title: 'Sponsor audit' },
    { id: 'E8', title: 'Letters of support' },
  ];

  const sampleRequirements: RequirementItem[] = [
    { id: 'req-1', num: 1, text: 'Nonprofit status letter', required: true, proof: 'E1 Status letter', status: 'ok', statusText: 'Done', evidenceKey: 'E1' },
    { id: 'req-2', num: 2, text: 'Serves the funder’s region', required: true, proof: 'E2 Annual report', status: 'ok', statusText: 'Done', evidenceKey: 'E2' },
    { id: 'req-3', num: 3, text: 'Audited financial report', required: true, proof: 'E7 Sponsor’s audit', status: 'ok', statusText: 'Done', evidenceKey: 'E7' },
    { id: 'req-4', num: 4, text: 'Project summary, 2 pages', required: true, proof: 'Draft, section 1', status: 'ok', statusText: 'Done', evidenceKey: null },
    { id: 'req-5', num: 5, text: 'Results from last year', required: true, proof: 'E4 Results file', status: 'gap', statusText: 'Needs a fix', evidenceKey: 'E4' },
    { id: 'req-6', num: 6, text: 'Budget, overhead under 15%', required: true, proof: 'E5 Budget sheet', status: 'ok', statusText: 'Done', evidenceKey: 'E5' },
    { id: 'req-7', num: 7, text: 'Two letters of support', required: false, proof: 'E8 Letters', status: 'ok', statusText: 'Done', evidenceKey: 'E8' },
    { id: 'req-8', num: 8, text: 'List of board members', required: true, proof: 'Not attached', status: 'miss', statusText: 'Missing', evidenceKey: null },
  ];

  const sampleDraft: DraftSection[] = [
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
  ];

  it('refuses approve when fixes are open', () => {
    const state: AppState = {
      approved: false,
      evidence: sampleEvidence,
      requirements: sampleRequirements,
      draft: sampleDraft,
      rubricScores: [],
      overallScore: 78,
      problems: [],
      fixes: [
        { id: 'fix-pay-claim', text: 'I added a source for the graduate pay claim.', done: false },
        { id: 'fix-board-list', text: 'I attached the board member list.', done: false },
      ],
      attachments: { board_members: false },
      decisionLog: [],
    };

    const approval = canApprove(state);
    expect(approval.allowed).toBe(false);
    expect(approval.reason).toBe('Fix both problems first.');
  });

  it('refuses approve when only one fix is done', () => {
    const state: AppState = {
      approved: false,
      evidence: sampleEvidence,
      requirements: sampleRequirements,
      draft: sampleDraft,
      rubricScores: [],
      overallScore: 78,
      problems: [],
      fixes: [
        { id: 'fix-pay-claim', text: 'I added a source for the graduate pay claim.', done: true },
        { id: 'fix-board-list', text: 'I attached the board member list.', done: false },
      ],
      attachments: { board_members: false },
      decisionLog: [],
    };

    const approval = canApprove(state);
    expect(approval.allowed).toBe(false);
    expect(approval.reason).toBe('Fix both problems first.');
  });

  it('allows approve after both fixes are done', () => {
    const state: AppState = {
      approved: false,
      evidence: sampleEvidence,
      requirements: sampleRequirements,
      draft: sampleDraft,
      rubricScores: [],
      overallScore: 88,
      problems: [],
      fixes: [
        { id: 'fix-pay-claim', text: 'I added a source for the graduate pay claim.', done: true },
        { id: 'fix-board-list', text: 'I attached the board member list.', done: true },
      ],
      attachments: { board_members: true },
      decisionLog: [],
    };

    const approval = canApprove(state);
    expect(approval.allowed).toBe(true);
  });

  it('catches a fake [E99] citation', () => {
    const draftWithFakeCitation: DraftSection[] = [
      {
        id: 'draft-1',
        sectionNum: 1,
        title: 'Why we need this',
        wordCount: 410,
        maxWords: 500,
        content: 'This claim cites an invalid evidence document [E99].',
      },
    ];

    const result = runChecker({
      evidence: sampleEvidence, // contains only E1-E8
      requirements: sampleRequirements,
      draft: draftWithFakeCitation,
      fixes: [
        { id: 'fix-pay-claim', text: 'pay claim', done: true },
        { id: 'fix-board-list', text: 'board list', done: true },
      ],
      attachments: { board_members: true },
    });

    expect(result.problems).toContain('Citation [E99] not found in evidence index.');
  });

  it('correctly calculates initial seed problems and 78/100 score', () => {
    const initialFixes: FixItem[] = [
      { id: 'fix-pay-claim', text: 'I added a source for the graduate pay claim.', done: false },
      { id: 'fix-board-list', text: 'I attached the board member list.', done: false },
    ];

    const result = runChecker({
      evidence: sampleEvidence,
      requirements: sampleRequirements,
      draft: sampleDraft,
      fixes: initialFixes,
      attachments: { board_members: false },
    });

    expect(result.overallScore).toBe(78);
    expect(result.rubricScores).toEqual([
      { name: 'Need', score: 24, max: 30 },
      { name: 'Approach', score: 23, max: 30 },
      { name: 'Capacity', score: 16, max: 20 },
      { name: 'Budget', score: 15, max: 20 },
    ]);
    expect(result.problems).toContain('One claim about graduate pay has no source.');
    expect(result.problems).toContain('The board member list is not attached.');
    expect(result.problems).toContain('Two spots still say GAP.');

    // Checklist row statuses in initial state
    const req5 = result.requirements.find((r) => r.id === 'req-5');
    expect(req5?.status).toBe('gap');
    expect(req5?.statusText).toBe('Needs a fix');

    const req8 = result.requirements.find((r) => r.id === 'req-8');
    expect(req8?.status).toBe('miss');
    expect(req8?.statusText).toBe('Missing');
  });

  it('resolves checklist statuses when fixes are checked', () => {
    const resolvedFixes: FixItem[] = [
      { id: 'fix-pay-claim', text: 'I added a source for the graduate pay claim.', done: true },
      { id: 'fix-board-list', text: 'I attached the board member list.', done: true },
    ];

    const result = runChecker({
      evidence: sampleEvidence,
      requirements: sampleRequirements,
      draft: sampleDraft,
      fixes: resolvedFixes,
      attachments: { board_members: true },
    });

    const req5 = result.requirements.find((r) => r.id === 'req-5');
    expect(req5?.status).toBe('ok');
    expect(req5?.statusText).toBe('Done');

    const req8 = result.requirements.find((r) => r.id === 'req-8');
    expect(req8?.status).toBe('ok');
    expect(req8?.statusText).toBe('Done');

    // Score increases to 88 because Need (+6) and Capacity (+4) are now satisfied
    expect(result.overallScore).toBe(88);
  });
});

