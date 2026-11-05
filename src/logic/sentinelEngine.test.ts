import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INCIDENT_SCENARIOS,
  formatTwoLineBlastRadius,
  calculateRollbackRisk,
  parseRoomCommand,
  formatSwitchSseFrame,
  createInitialRoomState,
  processHumanRoomMessage,
} from './sentinelEngine';

test('formatTwoLineBlastRadius produces strictly 2 non-empty lines with revenue and commit details', () => {
  const scenario = INCIDENT_SCENARIOS['checkout-stripe-null-ref'];
  const lines = formatTwoLineBlastRadius(scenario);
  assert.equal(lines.length, 2);
  assert.match(lines[0], /POST \/api\/v2\/checkout\/confirm/);
  assert.match(lines[0], /v2\.14\.0/);
  assert.match(lines[0], /8f9d2a1/);
  assert.match(lines[1], /\$14,200\/min/);
  assert.match(lines[1], /42\/200 active/);
});

test('calculateRollbackRisk computes LOW risk when zero schema migrations or queue changes exist', () => {
  const risk = calculateRollbackRisk({
    hasSchemaMigration: false,
    hasStatefulQueueChange: false,
    backwardCompatibleCache: true,
    canaryCoveragePct: 100,
  });
  assert.equal(risk.score, 0.08);
  assert.equal(risk.label, 'LOW');
  assert.match(risk.summary, /Zero DB schema migrations/);

  const highRisk = calculateRollbackRisk({
    hasSchemaMigration: true,
    hasStatefulQueueChange: true,
    backwardCompatibleCache: false,
    canaryCoveragePct: 50,
  });
  assert.equal(highRisk.label, 'HIGH');
  assert.ok(highRisk.score >= 0.6);
});

test('parseRoomCommand handles exact human approval and Wispr Flow spoken voice transcripts', () => {
  const exact = parseRoomCommand('@ops-release Approved. Roll back to v2.13.2');
  assert.equal(exact.addressedAgent, 'ops-release');
  assert.equal(exact.intent, 'APPROVE_ROLLBACK');
  assert.equal(exact.targetVersion, 'v2.13.2');
  assert.equal(exact.isVoiceNormalized, false);

  const wisprVoice = parseRoomCommand('ops release approved roll back to version 2 point 13 point 2');
  assert.equal(wisprVoice.addressedAgent, 'ops-release');
  assert.equal(wisprVoice.intent, 'APPROVE_ROLLBACK');
  assert.equal(wisprVoice.targetVersion, 'v2.13.2');
  assert.equal(wisprVoice.isVoiceNormalized, true);
});

test('processHumanRoomMessage enforces human approval gate and transitions incident to RESOLVED', () => {
  const initialState = createInitialRoomState('checkout-stripe-null-ref', true);
  assert.equal(initialState.incidentStatus, 'AWAITING_HUMAN_SIGNOFF');
  assert.equal(initialState.currentVersion, 'v2.14.0');

  const { nextState, parsedCommand } = processHumanRoomMessage(
    initialState,
    '@ops-release Approved. Roll back to v2.13.2',
    'alex.sre'
  );

  assert.equal(parsedCommand.intent, 'APPROVE_ROLLBACK');
  assert.equal(nextState.incidentStatus, 'RESOLVED');
  assert.equal(nextState.currentVersion, 'v2.13.2');
  assert.equal(nextState.metrics.http500RatePct, 0.01);
  assert.equal(nextState.metrics.revenueAtRiskPerMinUsd, 0);
  assert.ok(nextState.metrics.accumulatedRevenueSavedUsd > 0);

  const task104 = nextState.tasks.find((t) => t.id === 'TASK-104');
  assert.equal(task104?.status, 'completed');

  const humanAuthDecision = nextState.auditDecisions.find(
    (d) => d.actorType === 'HUMAN_APPROVAL' && d.status === 'AUTHORIZED'
  );
  assert.ok(humanAuthDecision);
  assert.equal(humanAuthDecision.targetVersion, 'v2.13.2');
});

test('formatSwitchSseFrame formats valid SSE wire protocol frames', () => {
  const frame = formatSwitchSseFrame('room.message', { sender: 'ops-triager', ok: true }, 'sse_101');
  assert.equal(
    frame,
    'id: sse_101\nevent: room.message\ndata: {"sender":"ops-triager","ok":true}\n\n'
  );
});
