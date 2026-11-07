export interface EvidenceItem {
  id: string; // "E1", "E2", ...
  title: string;
  description?: string;
}

export interface RequirementItem {
  id: string;
  num: number;
  text: string;
  required: boolean;
  proof: string;
  status: 'ok' | 'gap' | 'miss';
  statusText: string;
  evidenceKey?: string | null;
}

export interface DraftSection {
  id: string;
  sectionNum: number;
  title: string;
  wordCount: number;
  maxWords: number;
  content: string; // raw content with [E#], [GAP: ...], or unverified claims
  unverifiedClaims?: string[]; // claims without citation or GAP
}

export interface RubricCategory {
  name: string;
  score: number;
  max: number;
}

export interface FixItem {
  id: string;
  text: string;
  done: boolean;
}

export interface DecisionLogEntry {
  actor: string;
  action: string;
  timestamp: string;
}

export interface AppState {
  approved: boolean;
  approvedAt?: string | null;
  evidence: EvidenceItem[];
  requirements: RequirementItem[];
  draft: DraftSection[];
  rubricScores: RubricCategory[];
  overallScore: number;
  problems: string[];
  fixes: FixItem[];
  decisionLog: DecisionLogEntry[];
  attachments: { [key: string]: boolean };
}

