export type IncidentStatus =
  | 'NOMINAL'
  | 'TRIAGING'
  | 'REPRODUCING'
  | 'AWAITING_HUMAN_SIGNOFF'
  | 'ROLLING_BACK'
  | 'RESOLVED';

export type AgentId = 'ops-triager' | 'ops-repro' | 'ops-release' | 'human-operator' | 'switch-system';

export interface SwitchRoomMessage {
  id: string;
  timestamp: string;
  senderId: AgentId;
  senderDisplay: string;
  roleBadge: string;
  addressingMode: 'anyone' | 'owner-agents' | 'human-gated' | 'human' | 'system';
  content: string;
  codeSnippet?: {
    language: string;
    filename: string;
    code: string;
  };
  protocolMeta: {
    sseEventId: string;
    transport: 'SSE_IN' | 'HTTP_OUT' | 'CHAT_BRIDGE';
    latencyMs: number;
  };
}

export interface SwitchTask {
  id: string;
  title: string;
  assignee: AgentId;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked_on_human';
  updatedAt: string;
}

export interface AuditDecisionEntry {
  id: string;
  timestamp: string;
  actorType: 'AGENT_DECISION' | 'HUMAN_APPROVAL';
  actorId: AgentId;
  actorName: string;
  action: string;
  targetVersion: string;
  rationale: string;
  verificationHash: string;
  status: 'PROPOSED' | 'VERIFIED' | 'AUTHORIZED' | 'EXECUTED' | 'REJECTED';
}

export interface TelemetryLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'PROTOCOL';
  service: string;
  traceId: string;
  message: string;
}

export interface IncidentScenario {
  id: string;
  name: string;
  endpoint: string;
  offendingVersion: string;
  offendingCommit: string;
  commitAuthor: string;
  commitTimestamp: string;
  commitMessage: string;
  rollbackTargetVersion: string;
  rollbackTargetCommit: string;
  errorRatePeakPct: number;
  revenueLossPerMinUsd: number;
  affectedRegions: string[];
  exceptionType: string;
  exceptionMessage: string;
  dbPoolStatus: {
    activeConnections: number;
    maxConnections: number;
    idleConnections: number;
    p95QueryMs: number;
    lockWaitCount: number;
    healthy: boolean;
  };
  gitDiff: {
    filename: string;
    patch: string;
  };
  reproScript: {
    filename: string;
    code: string;
    output: string;
    exitCode: number;
  };
  rollbackFactors: {
    hasSchemaMigration: boolean;
    hasStatefulQueueChange: boolean;
    backwardCompatibleCache: boolean;
    canaryCoveragePct: number;
  };
}

export interface SwitchRoomState {
  roomId: string;
  roomName: string;
  chatAdapter: 'Mattermost' | 'Slack' | 'Discord' | 'Teams';
  channelName: string;
  incidentStatus: IncidentStatus;
  activeScenarioId: string;
  currentVersion: string;
  targetRollbackVersion: string;
  metrics: {
    http500RatePct: number;
    p99LatencyMs: number;
    revenueAtRiskPerMinUsd: number;
    accumulatedRevenueSavedUsd: number;
    dbPoolUtilizationPct: number;
    rollbackRiskScore: number;
    rollbackRiskLabel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  blastRadiusTwoLineSummary: string[];
  messages: SwitchRoomMessage[];
  tasks: SwitchTask[];
  auditDecisions: AuditDecisionEntry[];
  telemetryLogs: TelemetryLogEntry[];
}

export const INCIDENT_SCENARIOS: Record<string, IncidentScenario> = {
  'checkout-stripe-null-ref': {
    id: 'checkout-stripe-null-ref',
    name: 'Checkout API 500 Spike (Apple Pay Null Dereference)',
    endpoint: 'POST /api/v2/checkout/confirm',
    offendingVersion: 'v2.14.0',
    offendingCommit: '8f9d2a1',
    commitAuthor: 'm.chen@acme-pay.io',
    commitTimestamp: '2026-11-04T15:14:02Z',
    commitMessage: 'feat(checkout): enforce payment_method_metadata.card.funding tag on intent confirmation',
    rollbackTargetVersion: 'v2.13.2',
    rollbackTargetCommit: '4c1e9b0',
    errorRatePeakPct: 18.4,
    revenueLossPerMinUsd: 14200,
    affectedRegions: ['us-east-1', 'eu-central-1', 'ap-northeast-1'],
    exceptionType: 'TypeError',
    exceptionMessage: "Cannot read properties of undefined (reading 'funding') at confirmStripePaymentIntent (src/services/checkout/stripeIntent.ts:142:54)",
    dbPoolStatus: {
      activeConnections: 42,
      maxConnections: 200,
      idleConnections: 158,
      p95QueryMs: 1.8,
      lockWaitCount: 0,
      healthy: true,
    },
    gitDiff: {
      filename: 'src/services/checkout/stripeIntent.ts',
      patch: `@@ -136,9 +136,11 @@ export async function confirmStripePaymentIntent(
   const intent = await stripe.paymentIntents.retrieve(payload.intentId);
   const telemetryTags: Record<string, string> = {
     region: payload.region,
     merchantTier: payload.merchantTier,
-    fundingSource: intent.payment_method_options?.card?.funding ?? 'wallet_express',
+    // BUG in v2.14.0 (8f9d2a1): Apple Pay / Express wallets omit payment_method_metadata.card
+    fundingSource: intent.payment_method_metadata.card.funding,
+    threeDSecure: intent.payment_method_metadata.card.three_d_secure ?? 'optional',
   };
   return await ledger.recordConfirmedCapture(intent.id, telemetryTags);
 }`,
    },
    reproScript: {
      filename: 'repro_checkout_500.ts',
      code: `import assert from 'node:assert/strict';
import { confirmStripePaymentIntent } from './src/services/checkout/stripeIntent';

// Isolated sandbox payload simulating Apple Pay Express checkout (wallet_express)
const applePayExpressFixture = {
  intentId: 'pi_3Q9xLm2eZvKYlo2C0991aB',
  region: 'us-east-1',
  merchantTier: 'enterprise',
  payment_method_metadata: {
    type: 'apple_pay',
    wallet: { dynamic_last4: '4242' }
    // Note: .card is undefined for Apple Pay / Google Pay express tokens
  }
};

await assert.rejects(
  async () => confirmStripePaymentIntent(applePayExpressFixture),
  {
    name: 'TypeError',
    message: /Cannot read properties of undefined \\(reading 'funding'\\)/
  }
);
console.log('[REPRO_CONFIRMED] Deterministic 500 reproduced in 14ms (Exit Code 1 on v2.14.0, Passes on v2.13.2)');`,
      output: `[SANDBOX:runner-04] Executing repro_checkout_500.ts against commit 8f9d2a1 (v2.14.0)...
Uncaught TypeError: Cannot read properties of undefined (reading 'funding')
    at confirmStripePaymentIntent (src/services/checkout/stripeIntent.ts:142:54)
[REPRO_CONFIRMED] Deterministic 500 reproduced in 14ms (100% failure rate on wallet_express payloads).
[SANDBOX:runner-04] Verifying target rollback commit 4c1e9b0 (v2.13.2)... PASS (0 errors, 2.1ms).`,
      exitCode: 1,
    },
    rollbackFactors: {
      hasSchemaMigration: false,
      hasStatefulQueueChange: false,
      backwardCompatibleCache: true,
      canaryCoveragePct: 100,
    },
  },
  'billing-idempotency-regression': {
    id: 'billing-idempotency-regression',
    name: 'Enterprise Invoice Webhook 500s (Redis Key Serialization)',
    endpoint: 'POST /api/v2/billing/webhooks/invoice-paid',
    offendingVersion: 'v2.14.0',
    offendingCommit: '8f9d2a1',
    commitAuthor: 's.patel@acme-pay.io',
    commitTimestamp: '2026-11-04T15:14:02Z',
    commitMessage: 'perf(billing): strict BigInt serialization in idempotency lock header',
    rollbackTargetVersion: 'v2.13.2',
    rollbackTargetCommit: '4c1e9b0',
    errorRatePeakPct: 12.7,
    revenueLossPerMinUsd: 9800,
    affectedRegions: ['us-east-1', 'us-west-2'],
    exceptionType: 'TypeError',
    exceptionMessage: 'Do not know how to serialize a BigInt at JSON.stringify (src/services/billing/idempotencyLock.ts:88:19)',
    dbPoolStatus: {
      activeConnections: 38,
      maxConnections: 200,
      idleConnections: 162,
      p95QueryMs: 2.1,
      lockWaitCount: 0,
      healthy: true,
    },
    gitDiff: {
      filename: 'src/services/billing/idempotencyLock.ts',
      patch: `@@ -83,7 +83,8 @@ export async function acquireWebhookIdempotencyLock(event: StripeInvoiceEvent) {
   const lockKey = \`idem:invoice:\${event.accountId}:\${event.id}\`;
   const lockPayload = {
     acquiredAtNs: BigInt(Date.now()) * 1_000_000n,
-    amountCents: Number(event.amountPaidCents),
+    // BUG in v2.14.0: JSON.stringify throws TypeError on native BigInt
+    rawSequenceId: BigInt(event.sequenceNumber),
   };
   return await redis.set(lockKey, JSON.stringify(lockPayload), 'EX', 3600, 'NX');
 }`,
    },
    reproScript: {
      filename: 'repro_billing_bigint.ts',
      code: `import { acquireWebhookIdempotencyLock } from './src/services/billing/idempotencyLock';

const sampleInvoiceWebhook = {
  id: 'in_1Q9xKm2eZvKYlo2C881',
  accountId: 'acct_enterprise_99',
  amountPaidCents: 450000,
  sequenceNumber: '9007199254740993'
};

await acquireWebhookIdempotencyLock(sampleInvoiceWebhook);`,
      output: `[SANDBOX:runner-04] Executing repro_billing_bigint.ts against commit 8f9d2a1 (v2.14.0)...
Uncaught TypeError: Do not know how to serialize a BigInt
    at JSON.stringify (<anonymous>)
    at acquireWebhookIdempotencyLock (src/services/billing/idempotencyLock.ts:88:19)
[REPRO_CONFIRMED] Deterministic 500 reproduced in 9ms. Target v2.13.2 verified PASS.`,
      exitCode: 1,
    },
    rollbackFactors: {
      hasSchemaMigration: false,
      hasStatefulQueueChange: false,
      backwardCompatibleCache: true,
      canaryCoveragePct: 100,
    },
  },
};

/**
 * Formats the blast radius summary into strictly 2 lines as mandated by RULE-01.
 */
export function formatTwoLineBlastRadius(scenario: IncidentScenario): [string, string] {
  const line1 = `LINE 1 [CAUSE & SCOPE]: ${scenario.endpoint} throwing HTTP 500 (${scenario.errorRatePeakPct.toFixed(1)}% failure rate across ${scenario.affectedRegions.join(', ')}) traced to deploy ${scenario.offendingVersion} (commit ${scenario.offendingCommit}).`;
  const line2 = `LINE 2 [REVENUE IMPACT]: Est. $${scenario.revenueLossPerMinUsd.toLocaleString('en-US')}/min gross checkout burn via unguarded ${scenario.exceptionType}; PostgreSQL pool nominal (${scenario.dbPoolStatus.activeConnections}/${scenario.dbPoolStatus.maxConnections} active).`;
  return [line1, line2];
}

/**
 * Deterministically computes the rollback risk score (0.00 to 1.00) and risk label.
 */
export function calculateRollbackRisk(factors: IncidentScenario['rollbackFactors']): {
  score: number;
  label: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
} {
  let score = 0.08; // Base canary rollback overhead
  if (factors.hasSchemaMigration) score += 0.55;
  if (factors.hasStatefulQueueChange) score += 0.25;
  if (!factors.backwardCompatibleCache) score += 0.15;
  if (factors.canaryCoveragePct < 80) score += 0.1;

  const rounded = Number(Math.min(1, score).toFixed(2));
  const label: 'LOW' | 'MEDIUM' | 'HIGH' =
    rounded < 0.25 ? 'LOW' : rounded < 0.6 ? 'MEDIUM' : 'HIGH';

  const summary =
    !factors.hasSchemaMigration && !factors.hasStatefulQueueChange
      ? `Risk ${rounded.toFixed(2)} (${label}) — Zero DB schema migrations between versions; stateless container swap.`
      : `Risk ${rounded.toFixed(2)} (${label}) — Stateful or schema changes detected; requires staged drain.`;

  return { score: rounded, label, summary };
}

/**
 * Normalizes Wispr Flow voice dictation and standard chat input, then parses
 * addressing triggers and human rollback sign-off commands.
 */
export interface ParsedRoomCommand {
  normalizedText: string;
  addressedAgent: AgentId | null;
  intent:
    | 'APPROVE_ROLLBACK'
    | 'REJECT_ROLLBACK'
    | 'TRIGGER_TRIAGE'
    | 'REQUEST_REPRO'
    | 'STATUS_CHECK'
    | 'GENERAL_CHAT';
  targetVersion: string | null;
  isVoiceNormalized: boolean;
}

export function parseRoomCommand(rawInput: string, defaultTargetVersion = 'v2.13.2'): ParsedRoomCommand {
  const trimmed = rawInput.trim();
  let normalized = trimmed;
  let isVoiceNormalized = false;

  // Wispr Flow voice dictation normalization:
  // e.g., "ops release approved roll back to version 2 point 13 point 2"
  if (/^ops[\s-]+(release|triager|repro)\b/i.test(normalized)) {
    normalized = normalized.replace(/^ops[\s-]+(release|triager|repro)\b/i, (_, role) => `@ops-${role.toLowerCase()}`);
    isVoiceNormalized = true;
  }

  // Convert spoken "version 2 point 13 point 2" or "v 2 point 13 point 2" -> "v2.13.2"
  const spokenVersionRegex = /\b(?:version\s+|v\s+)(\d+)\s*(?:point|dot|\.)\s*(\d+)\s*(?:point|dot|\.)\s*(\d+)\b/gi;
  if (spokenVersionRegex.test(normalized)) {
    normalized = normalized.replace(spokenVersionRegex, 'v$1.$2.$3');
    isVoiceNormalized = true;
  }

  // Extract explicit version like v2.13.2
  const versionMatch = normalized.match(/\b(v\d+\.\d+\.\d+)\b/i);
  const extractedVersion = versionMatch ? versionMatch[1].toLowerCase() : null;

  // Detect addressed agent
  let addressedAgent: AgentId | null = null;
  if (/@ops-release\b/i.test(normalized) || /\bops[\s-]+release\b/i.test(normalized)) {
    addressedAgent = 'ops-release';
  } else if (/@ops-repro\b/i.test(normalized) || /\bops[\s-]+repro\b/i.test(normalized)) {
    addressedAgent = 'ops-repro';
  } else if (/@ops-triager\b/i.test(normalized) || /\bops[\s-]+triager\b/i.test(normalized)) {
    addressedAgent = 'ops-triager';
  }

  // Check for approval intent
  const hasApprovalKeyword = /\b(approved|approve|lgtm|confirm rollback|proceed with rollback)\b/i.test(normalized);
  const hasRollbackPhrase = /\b(roll\s*back|rollback|revert)\b/i.test(normalized);
  const hasRejectKeyword = /\b(reject|abort|hold|cancel|deny)\b/i.test(normalized);

  if (hasRejectKeyword && (addressedAgent === 'ops-release' || hasRollbackPhrase)) {
    return {
      normalizedText: normalized,
      addressedAgent: addressedAgent ?? 'ops-release',
      intent: 'REJECT_ROLLBACK',
      targetVersion: extractedVersion,
      isVoiceNormalized,
    };
  }

  if (hasApprovalKeyword && (addressedAgent === 'ops-release' || hasRollbackPhrase)) {
    return {
      normalizedText: normalized,
      addressedAgent: 'ops-release',
      intent: 'APPROVE_ROLLBACK',
      targetVersion: extractedVersion ?? defaultTargetVersion,
      isVoiceNormalized,
    };
  }

  if (
    addressedAgent === 'ops-triager' ||
    /\b(triage|spike|500s|sentry|blast radius)\b/i.test(normalized)
  ) {
    return {
      normalizedText: normalized,
      addressedAgent: 'ops-triager',
      intent: 'TRIGGER_TRIAGE',
      targetVersion: extractedVersion,
      isVoiceNormalized,
    };
  }

  if (addressedAgent === 'ops-repro' || /\b(repro|reproduce|diff|database|pool)\b/i.test(normalized)) {
    return {
      normalizedText: normalized,
      addressedAgent: 'ops-repro',
      intent: 'REQUEST_REPRO',
      targetVersion: extractedVersion,
      isVoiceNormalized,
    };
  }

  return {
    normalizedText: normalized,
    addressedAgent,
    intent: 'GENERAL_CHAT',
    targetVersion: extractedVersion,
    isVoiceNormalized,
  };
}

/**
 * Formats a Server-Sent Events (SSE) wire frame compliant with the Switch Agent Protocol.
 */
export function formatSwitchSseFrame(eventType: string, payload: unknown, eventId?: string): string {
  const lines: string[] = [];
  if (eventId) {
    lines.push(`id: ${eventId}`);
  }
  lines.push(`event: ${eventType}`);
  lines.push(`data: ${JSON.stringify(payload)}`);
  return lines.join('\n') + '\n\n';
}

/**
 * Builds the initial seeded Switch Room state so the HUD immediately displays
 * an active, realistic incident awaiting human sign-off (or ready to re-trigger).
 */
export function createInitialRoomState(
  scenarioId = 'checkout-stripe-null-ref',
  startInAwaitingApproval = true
): SwitchRoomState {
  const scenario = INCIDENT_SCENARIOS[scenarioId] ?? INCIDENT_SCENARIOS['checkout-stripe-null-ref'];
  const [line1, line2] = formatTwoLineBlastRadius(scenario);
  const risk = calculateRollbackRisk(scenario.rollbackFactors);

  if (!startInAwaitingApproval) {
    return {
      roomId: 'room_switch_99201a',
      roomName: 'inc-checkout-500-sentinel',
      chatAdapter: 'Mattermost',
      channelName: '#incident-war-room',
      incidentStatus: 'NOMINAL',
      activeScenarioId: scenario.id,
      currentVersion: scenario.rollbackTargetVersion,
      targetRollbackVersion: scenario.rollbackTargetVersion,
      metrics: {
        http500RatePct: 0.02,
        p99LatencyMs: 84,
        revenueAtRiskPerMinUsd: 0,
        accumulatedRevenueSavedUsd: 0,
        dbPoolUtilizationPct: 19,
        rollbackRiskScore: risk.score,
        rollbackRiskLabel: risk.label,
      },
      blastRadiusTwoLineSummary: [
        'LINE 1 [NOMINAL]: Checkout API operating normally at 0.02% 5xx rate.',
        'LINE 2 [REVENUE IMPACT]: $0/min exposure; all regional health checks green.',
      ],
      messages: [
        {
          id: 'msg-kickoff-01',
          timestamp: '15:14:00.102',
          senderId: 'switch-system',
          senderDisplay: 'Switch Core Runtime',
          roleBadge: 'ROOM_BROKER',
          addressingMode: 'system',
          content:
            '[SWITCH ROOM INITIALIZED] Revenue Incident & Rollback Sentinel active. Listening for Sentry/Datadog error spikes on POST /api/v2/checkout/confirm.',
          protocolMeta: {
            sseEventId: 'sse_0001',
            transport: 'SSE_IN',
            latencyMs: 4,
          },
        },
      ],
      tasks: [
        {
          id: 'TASK-101',
          title: 'Isolate offending commit and quantify revenue blast radius',
          assignee: 'ops-triager',
          status: 'pending',
          updatedAt: '15:14:00',
        },
        {
          id: 'TASK-102',
          title: 'Verify PostgreSQL pool health, inspect git diff, and execute isolated repro script',
          assignee: 'ops-repro',
          status: 'pending',
          updatedAt: '15:14:00',
        },
        {
          id: 'TASK-103',
          title: 'Stage canary rollback PR, compute risk score, and request human release approval',
          assignee: 'ops-release',
          status: 'pending',
          updatedAt: '15:14:00',
        },
        {
          id: 'TASK-104',
          title: 'Verify human sign-off and trigger production rollback webhook',
          assignee: 'ops-release',
          status: 'blocked_on_human',
          updatedAt: '15:14:00',
        },
      ],
      auditDecisions: [],
      telemetryLogs: [
        {
          id: 'log-001',
          timestamp: '15:14:00.102',
          level: 'PROTOCOL',
          service: 'switch-core',
          traceId: 'tr_99100a',
          message: 'SSE stream connected: agents=[ops-triager, ops-repro, ops-release] room=inc-checkout-500-sentinel',
        },
      ],
    };
  }

  // Default seeded state: Incident triaged, reproduced, and paused at AWAITING_HUMAN_SIGNOFF
  // so judges can immediately inspect the 3-agent collaboration OR click "Approve Rollback" / "Re-Run Incident".
  return {
    roomId: 'room_switch_99201a',
    roomName: 'inc-checkout-500-sentinel',
    chatAdapter: 'Mattermost',
    channelName: '#incident-war-room',
    incidentStatus: 'AWAITING_HUMAN_SIGNOFF',
    activeScenarioId: scenario.id,
    currentVersion: scenario.offendingVersion,
    targetRollbackVersion: scenario.rollbackTargetVersion,
    metrics: {
      http500RatePct: scenario.errorRatePeakPct,
      p99LatencyMs: 1420,
      revenueAtRiskPerMinUsd: scenario.revenueLossPerMinUsd,
      accumulatedRevenueSavedUsd: 0,
      dbPoolUtilizationPct: Math.round(
        (scenario.dbPoolStatus.activeConnections / scenario.dbPoolStatus.maxConnections) * 100
      ),
      rollbackRiskScore: risk.score,
      rollbackRiskLabel: risk.label,
    },
    blastRadiusTwoLineSummary: [line1, line2],
    messages: [
      {
        id: 'msg-kickoff-01',
        timestamp: '15:14:05.012',
        senderId: 'switch-system',
        senderDisplay: 'Switch Core · Sentry Webhook',
        roleBadge: 'EVENT_INGEST',
        addressingMode: 'anyone',
        content: `EVENT:SENTRY_ERROR_SPIKE received on ${scenario.endpoint} — HTTP 500 rate jumped from 0.02% to ${scenario.errorRatePeakPct}% following deploy ${scenario.offendingVersion}. Addressing @ops-triager.`,
        protocolMeta: {
          sseEventId: 'sse_1041',
          transport: 'SSE_IN',
          latencyMs: 8,
        },
      },
      {
        id: 'msg-triager-02',
        timestamp: '15:14:06.840',
        senderId: 'ops-triager',
        senderDisplay: 'ops-triager',
        roleBadge: 'SENTRY_TRIAGER',
        addressingMode: 'anyone',
        content: `${line1}\n${line2}\n\nHanding off commit \`${scenario.offendingCommit}\` (\`${scenario.offendingVersion}\` by ${scenario.commitAuthor}) to @ops-repro for DB verification and isolated sandbox reproduction.`,
        protocolMeta: {
          sseEventId: 'sse_1042',
          transport: 'HTTP_OUT',
          latencyMs: 310,
        },
      },
      {
        id: 'msg-repro-03',
        timestamp: '15:14:09.420',
        senderId: 'ops-repro',
        senderDisplay: 'ops-repro',
        roleBadge: 'DIAGNOSTIC_REPRO',
        addressingMode: 'owner-agents',
        content: `PostgreSQL pool verified HEALTHY (${scenario.dbPoolStatus.activeConnections}/${scenario.dbPoolStatus.maxConnections} active connections, ${scenario.dbPoolStatus.p95QueryMs}ms p95, ${scenario.dbPoolStatus.lockWaitCount} lock waits). Isolated regression in \`${scenario.gitDiff.filename}\` (commit \`${scenario.offendingCommit}\`) and confirmed 100% deterministic crash via \`${scenario.reproScript.filename}\`. Handing off to @ops-release.`,
        codeSnippet: {
          language: 'diff',
          filename: scenario.gitDiff.filename,
          code: scenario.gitDiff.patch,
        },
        protocolMeta: {
          sseEventId: 'sse_1043',
          transport: 'HTTP_OUT',
          latencyMs: 540,
        },
      },
      {
        id: 'msg-release-04',
        timestamp: '15:14:11.905',
        senderId: 'ops-release',
        senderDisplay: 'ops-release',
        roleBadge: 'RELEASE_CONTROLLER',
        addressingMode: 'human-gated',
        content: `Canary rollback plan **RB-2026-089** staged: revert \`${scenario.offendingVersion}\` (${scenario.offendingCommit}) -> \`${scenario.rollbackTargetVersion}\` (${scenario.rollbackTargetCommit}) + opened Hotfix PR #1842.\n• Rollback Risk Assessment: **${risk.summary}**\n• Switch Room Rule \`RULE-03\` Active: Production deployment webhook is locked pending human authorization.\n\n**Action Required:** Reply \`@ops-release Approved. Roll back to ${scenario.rollbackTargetVersion}\` (or dictate via Wispr Flow) to execute rollback.`,
        protocolMeta: {
          sseEventId: 'sse_1044',
          transport: 'HTTP_OUT',
          latencyMs: 285,
        },
      },
    ],
    tasks: [
      {
        id: 'TASK-101',
        title: 'Isolate offending commit and quantify revenue blast radius',
        assignee: 'ops-triager',
        status: 'completed',
        updatedAt: '15:14:06',
      },
      {
        id: 'TASK-102',
        title: 'Verify PostgreSQL pool health, inspect git diff, and execute isolated repro script',
        assignee: 'ops-repro',
        status: 'completed',
        updatedAt: '15:14:09',
      },
      {
        id: 'TASK-103',
        title: 'Stage canary rollback PR, compute risk score, and request human release approval',
        assignee: 'ops-release',
        status: 'completed',
        updatedAt: '15:14:11',
      },
      {
        id: 'TASK-104',
        title: 'Verify human sign-off and trigger production rollback webhook',
        assignee: 'ops-release',
        status: 'blocked_on_human',
        updatedAt: '15:14:12',
      },
    ],
    auditDecisions: [
      {
        id: 'dec-01',
        timestamp: '15:14:06.840',
        actorType: 'AGENT_DECISION',
        actorId: 'ops-triager',
        actorName: '@ops-triager',
        action: 'ISOLATE_OFFENDING_DEPLOY',
        targetVersion: scenario.offendingVersion,
        rationale: `Correlated HTTP 500 spike (${scenario.errorRatePeakPct}%) on ${scenario.endpoint} with release tag ${scenario.offendingVersion} (SHA ${scenario.offendingCommit}).`,
        verificationHash: 'sha256:7c9e21f8a04b',
        status: 'VERIFIED',
      },
      {
        id: 'dec-02',
        timestamp: '15:14:09.420',
        actorType: 'AGENT_DECISION',
        actorId: 'ops-repro',
        actorName: '@ops-repro',
        action: 'CONFIRM_SANDBOX_REPRODUCTION',
        targetVersion: scenario.offendingVersion,
        rationale: `Ruled out DB saturation (${scenario.dbPoolStatus.activeConnections}/${scenario.dbPoolStatus.maxConnections} conn); reproduced ${scenario.exceptionType} in ${scenario.reproScript.filename}.`,
        verificationHash: 'sha256:3a8b94d1e220',
        status: 'VERIFIED',
      },
      {
        id: 'dec-03',
        timestamp: '15:14:11.905',
        actorType: 'AGENT_DECISION',
        actorId: 'ops-release',
        actorName: '@ops-release',
        action: 'PROPOSE_CANARY_ROLLBACK',
        targetVersion: scenario.rollbackTargetVersion,
        rationale: `${risk.summary} Halted at RULE-03 human approval gate.`,
        verificationHash: 'sha256:9f41d0c6b512',
        status: 'PROPOSED',
      },
    ],
    telemetryLogs: [
      {
        id: 'log-101',
        timestamp: '15:14:05.012',
        level: 'ERROR',
        service: 'checkout-api',
        traceId: 'tr_88219a',
        message: `${scenario.endpoint} 500 Internal Server Error — ${scenario.exceptionType}: ${scenario.exceptionMessage}`,
      },
      {
        id: 'log-102',
        timestamp: '15:14:05.110',
        level: 'PROTOCOL',
        service: 'switch-core',
        traceId: 'tr_88219b',
        message: 'SSE dispatch -> @ops-triager (mode=anyone, trigger=EVENT:SENTRY_ERROR_SPIKE)',
      },
      {
        id: 'log-103',
        timestamp: '15:14:06.840',
        level: 'INFO',
        service: 'ops-triager',
        traceId: 'tr_88219c',
        message: `Blast radius computed: $${scenario.revenueLossPerMinUsd}/min across ${scenario.affectedRegions.length} regions. Commit isolated: ${scenario.offendingCommit}.`,
      },
      {
        id: 'log-104',
        timestamp: '15:14:07.005',
        level: 'PROTOCOL',
        service: 'switch-core',
        traceId: 'tr_88219d',
        message: 'SSE dispatch -> @ops-repro (mode=owner-agents, sender=ops-triager)',
      },
      {
        id: 'log-105',
        timestamp: '15:14:09.420',
        level: 'INFO',
        service: 'ops-repro',
        traceId: 'tr_88219e',
        message: `Sandbox exec ${scenario.reproScript.filename}: exitCode=1 on ${scenario.offendingVersion}, exitCode=0 on ${scenario.rollbackTargetVersion}.`,
      },
      {
        id: 'log-106',
        timestamp: '15:14:11.905',
        level: 'WARN',
        service: 'ops-release',
        traceId: 'tr_88219f',
        message: `Rollback plan RB-2026-089 staged for ${scenario.rollbackTargetVersion} (risk=${risk.score}). Awaiting human sign-off in room.`,
      },
    ],
  };
}

/**
 * Processes a human message in the Switch Room and executes the appropriate
 * state transition (including executing the rollback if approved).
 */
export function processHumanRoomMessage(
  state: SwitchRoomState,
  rawMessage: string,
  operatorHandle = 'varun.sre (On-Call Lead)'
): {
  nextState: SwitchRoomState;
  parsedCommand: ParsedRoomCommand;
  newMessages: SwitchRoomMessage[];
} {
  const scenario = INCIDENT_SCENARIOS[state.activeScenarioId] ?? INCIDENT_SCENARIOS['checkout-stripe-null-ref'];
  const parsed = parseRoomCommand(rawMessage, scenario.rollbackTargetVersion);
  const nowStr = new Date().toISOString().slice(11, 23);

  const humanMsg: SwitchRoomMessage = {
    id: `msg-human-${Date.now()}`,
    timestamp: nowStr,
    senderId: 'human-operator',
    senderDisplay: operatorHandle,
    roleBadge: parsed.isVoiceNormalized ? 'HUMAN · WISPR_VOICE' : 'HUMAN_OPERATOR',
    addressingMode: 'human',
    content: rawMessage.trim(),
    protocolMeta: {
      sseEventId: `sse_${Math.floor(1000 + Math.random() * 8999)}`,
      transport: 'CHAT_BRIDGE',
      latencyMs: 12,
    },
  };

  const newMessages: SwitchRoomMessage[] = [humanMsg];
  let nextState: SwitchRoomState = {
    ...state,
    messages: [...state.messages, humanMsg],
    telemetryLogs: [
      ...state.telemetryLogs,
      {
        id: `log-${Date.now()}-h`,
        timestamp: nowStr,
        level: 'PROTOCOL',
        service: 'switch-chat-bridge',
        traceId: `tr_${Math.random().toString(16).slice(2, 8)}`,
        message: `Inbound chat message from ${operatorHandle}: "${ parsed.normalizedText }" (intent=${parsed.intent})`,
      },
    ],
  };

  if (parsed.intent === 'APPROVE_ROLLBACK') {
    const targetVer = parsed.targetVersion ?? scenario.rollbackTargetVersion;
    const releaseMsg: SwitchRoomMessage = {
      id: `msg-release-${Date.now() + 1}`,
      timestamp: nowStr,
      senderId: 'ops-release',
      senderDisplay: 'ops-release',
      roleBadge: 'RELEASE_CONTROLLER',
      addressingMode: 'human-gated',
      content: `Human sign-off verified from **${operatorHandle}** for target \`${targetVer}\`.\n1. Triggered production deployment rollback webhook \`POST /webhooks/deploy/rollback\` (commit \`${scenario.rollbackTargetCommit}\`).\n2. Shifted canary traffic \`100% -> ${targetVer}\` across \`${scenario.affectedRegions.join(', ')}\`.\n3. Post-rollback telemetry check: \`${scenario.endpoint}\` HTTP 500 rate dropped from **${scenario.errorRatePeakPct}% -> 0.01%** (p99 latency **82ms**). Incident **RESOLVED**.`,
      protocolMeta: {
        sseEventId: `sse_${Math.floor(1000 + Math.random() * 8999)}`,
        transport: 'HTTP_OUT',
        latencyMs: 410,
      },
    };

    newMessages.push(releaseMsg);

    const humanAudit: AuditDecisionEntry = {
      id: `dec-human-${Date.now()}`,
      timestamp: nowStr,
      actorType: 'HUMAN_APPROVAL',
      actorId: 'human-operator',
      actorName: operatorHandle,
      action: 'AUTHORIZE_PRODUCTION_ROLLBACK',
      targetVersion: targetVer,
      rationale: `Explicit human sign-off in Switch room: "${rawMessage.trim()}"`,
      verificationHash: 'sha256:e4b89012fa7c',
      status: 'AUTHORIZED',
    };

    const execAudit: AuditDecisionEntry = {
      id: `dec-exec-${Date.now() + 1}`,
      timestamp: nowStr,
      actorType: 'AGENT_DECISION',
      actorId: 'ops-release',
      actorName: '@ops-release',
      action: 'EXECUTE_ROLLBACK_WEBHOOK',
      targetVersion: targetVer,
      rationale: `Webhook executed after RULE-03 human sign-off. Traffic shifted 100% to ${targetVer} (${scenario.rollbackTargetCommit}).`,
      verificationHash: 'sha256:019c88a4d3f1',
      status: 'EXECUTED',
    };

    nextState = {
      ...nextState,
      incidentStatus: 'RESOLVED',
      currentVersion: targetVer,
      metrics: {
        ...nextState.metrics,
        http500RatePct: 0.01,
        p99LatencyMs: 82,
        revenueAtRiskPerMinUsd: 0,
        accumulatedRevenueSavedUsd: scenario.revenueLossPerMinUsd * 30,
      },
      blastRadiusTwoLineSummary: [
        `LINE 1 [RESOLVED]: ${scenario.endpoint} rolled back to ${targetVer} (${scenario.rollbackTargetCommit}); HTTP 500 rate recovered from ${scenario.errorRatePeakPct}% to 0.01%.`,
        `LINE 2 [REVENUE PROTECTED]: Saved est. $${(scenario.revenueLossPerMinUsd * 30).toLocaleString('en-US')} in projected 30-min outage burn; human sign-off logged by ${operatorHandle}.`,
      ],
      messages: [...nextState.messages, releaseMsg],
      tasks: nextState.tasks.map((t) =>
        t.id === 'TASK-104' ? { ...t, status: 'completed', updatedAt: nowStr.slice(0, 8) } : t
      ),
      auditDecisions: [...nextState.auditDecisions, humanAudit, execAudit],
      telemetryLogs: [
        ...nextState.telemetryLogs,
        {
          id: `log-${Date.now()}-a`,
          timestamp: nowStr,
          level: 'INFO',
          service: 'switch-core',
          traceId: 'tr_99401a',
          message: `RULE-03 human gate satisfied by ${operatorHandle} -> unlocking deploy.trigger_rollback for @ops-release`,
        },
        {
          id: `log-${Date.now()}-b`,
          timestamp: nowStr,
          level: 'INFO',
          service: 'deploy-webhook',
          traceId: 'tr_99401b',
          message: `Canary rollback complete: version=${targetVer} commit=${scenario.rollbackTargetCommit} http_500_rate=0.01% status=RESOLVED`,
        },
      ],
    };
  } else if (parsed.intent === 'REJECT_ROLLBACK') {
    const rejectMsg: SwitchRoomMessage = {
      id: `msg-release-${Date.now() + 1}`,
      timestamp: nowStr,
      senderId: 'ops-release',
      senderDisplay: 'ops-release',
      roleBadge: 'RELEASE_CONTROLLER',
      addressingMode: 'human-gated',
      content: `Rollback to \`${scenario.rollbackTargetVersion}\` **HELD / ABORTED** per instruction from **${operatorHandle}**. Keeping deployment webhook locked and standing by for hotfix PR #1842 or updated command.`,
      protocolMeta: {
        sseEventId: `sse_${Math.floor(1000 + Math.random() * 8999)}`,
        transport: 'HTTP_OUT',
        latencyMs: 180,
      },
    };

    newMessages.push(rejectMsg);

    const rejectAudit: AuditDecisionEntry = {
      id: `dec-human-reject-${Date.now()}`,
      timestamp: nowStr,
      actorType: 'HUMAN_APPROVAL',
      actorId: 'human-operator',
      actorName: operatorHandle,
      action: 'HOLD_PRODUCTION_ROLLBACK',
      targetVersion: scenario.rollbackTargetVersion,
      rationale: `Operator held rollback in chat: "${rawMessage.trim()}"`,
      verificationHash: 'sha256:4491bc02e8a1',
      status: 'REJECTED',
    };

    nextState = {
      ...nextState,
      messages: [...nextState.messages, rejectMsg],
      auditDecisions: [...nextState.auditDecisions, rejectAudit],
    };
  } else if (parsed.intent === 'TRIGGER_TRIAGE') {
    const freshTriagedState = createInitialRoomState(state.activeScenarioId, true);
    const [l1, l2] = freshTriagedState.blastRadiusTwoLineSummary;
    const replyMsg: SwitchRoomMessage = {
      id: `msg-triager-${Date.now() + 1}`,
      timestamp: nowStr,
      senderId: 'ops-triager',
      senderDisplay: 'ops-triager',
      roleBadge: 'SENTRY_TRIAGER',
      addressingMode: 'anyone',
      content: `${l1}\n${l2}\n\nRe-verified commit \`${scenario.offendingCommit}\` (\`${scenario.offendingVersion}\`). @ops-repro and @ops-release artifacts are attached in room state.`,
      protocolMeta: {
        sseEventId: `sse_${Math.floor(1000 + Math.random() * 8999)}`,
        transport: 'HTTP_OUT',
        latencyMs: 245,
      },
    };
    newMessages.push(replyMsg);
    nextState = {
      ...freshTriagedState,
      messages: [...nextState.messages, replyMsg],
    };
  } else if (parsed.intent === 'REQUEST_REPRO') {
    const replyMsg: SwitchRoomMessage = {
      id: `msg-repro-${Date.now() + 1}`,
      timestamp: nowStr,
      senderId: 'ops-repro',
      senderDisplay: 'ops-repro',
      roleBadge: 'DIAGNOSTIC_REPRO',
      addressingMode: 'owner-agents',
      content: `Re-ran isolated reproduction \`${scenario.reproScript.filename}\` against \`${scenario.offendingCommit}\`. PostgreSQL pool remains nominal (${scenario.dbPoolStatus.activeConnections}/${scenario.dbPoolStatus.maxConnections} active, ${scenario.dbPoolStatus.p95QueryMs}ms p95). Waiting on \`@ops-release Approved. Roll back to ${scenario.rollbackTargetVersion}\`.`,
      codeSnippet: {
        language: 'typescript',
        filename: scenario.reproScript.filename,
        code: scenario.reproScript.code,
      },
      protocolMeta: {
        sseEventId: `sse_${Math.floor(1000 + Math.random() * 8999)}`,
        transport: 'HTTP_OUT',
        latencyMs: 320,
      },
    };
    newMessages.push(replyMsg);
    nextState = {
      ...nextState,
      messages: [...nextState.messages, replyMsg],
    };
  } else {
    const targetAgent = parsed.addressedAgent ?? 'ops-release';
    const replyMsg: SwitchRoomMessage = {
      id: `msg-agent-${Date.now() + 1}`,
      timestamp: nowStr,
      senderId: targetAgent,
      senderDisplay: targetAgent,
      roleBadge: 'SWITCH_AGENT',
      addressingMode: 'anyone',
      content: `Acknowledged message in Switch room \`${state.roomName}\`. Current status: **${state.incidentStatus}** (Active release: \`${state.currentVersion}\`). To authorize the staged canary rollback, reply: \`@ops-release Approved. Roll back to ${scenario.rollbackTargetVersion}\`.`,
      protocolMeta: {
        sseEventId: `sse_${Math.floor(1000 + Math.random() * 8999)}`,
        transport: 'HTTP_OUT',
        latencyMs: 195,
      },
    };
    newMessages.push(replyMsg);
    nextState = {
      ...nextState,
      messages: [...nextState.messages, replyMsg],
    };
  }

  return { nextState, parsedCommand: parsed, newMessages };
}
