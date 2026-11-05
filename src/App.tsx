import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  RotateCcw,
  Zap,
  ShieldAlert,
  Radio,
} from 'lucide-react';
import {
  INCIDENT_SCENARIOS,
  IncidentScenario,
  SwitchRoomState,
  createInitialRoomState,
  processHumanRoomMessage,
} from './logic/sentinelEngine';
import { SwitchRoomChatPane } from './components/SwitchRoomChatPane';
import { DiagnosticsDiffPane } from './components/DiagnosticsDiffPane';
import { AuditAndLogsPane } from './components/AuditAndLogsPane';
import { DeliverablesBundle, DeliverablesModalView } from './components/DeliverablesModalView';

export default function App() {
  const [roomState, setRoomState] = useState<SwitchRoomState>(() =>
    createInitialRoomState('checkout-stripe-null-ref', true)
  );
  const [activeScenario, setActiveScenario] = useState<IncidentScenario>(
    () => INCIDENT_SCENARIOS['checkout-stripe-null-ref']
  );
  const [deliverables, setDeliverables] = useState<DeliverablesBundle | null>(null);
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<
    'hud' | 'room' | 'audit' | 'deliverables'
  >('hud');

  // Fetch initial state & deliverables from backend
  const fetchInitialData = useCallback(async () => {
    try {
      const [stateRes, delivRes] = await Promise.all([
        fetch('/api/switch/state'),
        fetch('/api/deliverables'),
      ]);
      if (stateRes.ok) {
        const data = await stateRes.json();
        if (data.roomState) setRoomState(data.roomState);
        if (data.activeScenario) setActiveScenario(data.activeScenario);
      }
      if (delivRes.ok) {
        const delivData = await delivRes.json();
        setDeliverables(delivData);
      }
    } catch {
      // Fallback uses deterministic local state
    }
  }, []);

  // Connect to Switch Agent Protocol Server-Sent Events (SSE) stream
  useEffect(() => {
    fetchInitialData();

    const eventSource = new EventSource('/api/switch/stream?agent=hud-observer');

    eventSource.addEventListener('switch.handshake', () => {
      setSseConnected(true);
    });

    eventSource.addEventListener('room.state_updated', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.roomState) setRoomState(parsed.roomState);
        if (parsed.activeScenario) setActiveScenario(parsed.activeScenario);
      } catch {
        // Ignore malformed frame
      }
    });

    eventSource.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [fetchInitialData]);

  // Trigger or reset simulated Sentry 500 spike
  const handleTriggerScenario = async (
    scenarioId: string,
    mode: 'triaged' | 'nominal' = 'triaged'
  ) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/webhooks/sentry-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId, mode }),
      });
      if (res.ok) {
        const data = await res.json();
        setRoomState(data.roomState);
        setActiveScenario(data.activeScenario);
      } else {
        const fallback = createInitialRoomState(scenarioId, mode === 'triaged');
        setRoomState(fallback);
        setActiveScenario(INCIDENT_SCENARIOS[scenarioId]);
      }
    } catch {
      const fallback = createInitialRoomState(scenarioId, mode === 'triaged');
      setRoomState(fallback);
      setActiveScenario(INCIDENT_SCENARIOS[scenarioId]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Post a message / approval command to the Switch Room
  const handleSendRoomMessage = async (
    message: string,
    operatorHandle = 'varun.sre (On-Call Lead)'
  ) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/switch/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          operatorHandle,
          chatAdapter: roomState.chatAdapter,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRoomState(data.roomState);
        setActiveScenario(data.activeScenario);
      } else {
        const local = processHumanRoomMessage(roomState, message, operatorHandle);
        setRoomState(local.nextState);
      }
    } catch {
      const local = processHumanRoomMessage(roomState, message, operatorHandle);
      setRoomState(local.nextState);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectChatAdapter = (
    adapter: 'Mattermost' | 'Slack' | 'Discord' | 'Teams'
  ) => {
    setRoomState((prev) => ({ ...prev, chatAdapter: adapter }));
  };

  const scrollToSection = (
    section: 'hud' | 'room' | 'audit' | 'deliverables',
    elementId: string
  ) => {
    setActiveSection(section);
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const isCritical =
    roomState.incidentStatus === 'AWAITING_HUMAN_SIGNOFF' ||
    roomState.incidentStatus === 'TRIAGING' ||
    roomState.incidentStatus === 'REPRODUCING';
  const isResolved = roomState.incidentStatus === 'RESOLVED';

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">
      {/* =====================================================================
          STRICT 3-ZONE TOP BAR CONTRACT
          Zone 1: Single text element wordmark
          Zone 2: 4 concise single-line navigation links
          Zone 3: 1 primary action button
         ===================================================================== */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-[#27272a] bg-[#09090b]">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('hud');
          }}
          className="text-base font-bold tracking-tight text-zinc-100 whitespace-nowrap shrink-0"
        >
          Sentinel Switch
        </a>

        {/* Zone 2: 4 Single-Line Navigation Links */}
        <nav
          aria-label="Primary Workspace Navigation"
          className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-400"
        >
          <a
            href="#incident-hud"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('hud', 'incident-hud');
            }}
            className={`hover:text-zinc-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'hud' ? 'text-zinc-100 underline' : ''
            }`}
          >
            Incident HUD
          </a>
          <a
            href="#switch-room-workspace"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('room', 'switch-room-workspace');
            }}
            className={`hover:text-zinc-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'room' ? 'text-zinc-100 underline' : ''
            }`}
          >
            Switch Room
          </a>
          <a
            href="#audit-telemetry-section"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('audit', 'audit-telemetry-section');
            }}
            className={`hover:text-zinc-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'audit' ? 'text-zinc-100 underline' : ''
            }`}
          >
            Audit Ledger
          </a>
          <a
            href="#deliverables-section"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('deliverables', 'deliverables-section');
            }}
            className={`hover:text-zinc-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'deliverables' ? 'text-zinc-100 underline' : ''
            }`}
          >
            Deliverables
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleTriggerScenario(roomState.activeScenarioId, 'triaged')}
            className="px-3.5 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            Trigger 500 Incident
          </button>
        </div>
      </header>

      {/* =====================================================================
          MAIN TACTICAL WORKSPACE (1440px Desktop Presence)
         ===================================================================== */}
      <main id="incident-hud" className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Workspace Context & Simulation Control Bar */}
        <section
          aria-label="Incident Control and Scenario Toolbar"
          className="bg-[#18181b] border border-[#27272a] p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-zinc-400">
              <span>Track 01: Best Business Workflow</span>
              <span aria-hidden="true">·</span>
              <span>Switch Agent Protocol (SSE In / HTTP Out)</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-zinc-300">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                {sseConnected ? 'SSE Connected' : 'Local Runtime Active'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
              Critical Revenue Incident & Rollback Sentinel
            </h1>
            <p className="text-xs text-zinc-400 max-w-3xl">
              Autonomous triage (<code className="font-mono text-zinc-200">@ops-triager</code>),
              deterministic sandbox reproduction (<code className="font-mono text-zinc-200">@ops-repro</code>),
              and human-gated canary rollback (<code className="font-mono text-zinc-200">@ops-release</code>)
              synchronized inside a shared Switch Room.
            </p>
          </div>

          {/* Scenario Switcher & Quick State Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="scenario-select" className="text-xs font-mono text-zinc-400">
              Scenario:
            </label>
            <select
              id="scenario-select"
              value={roomState.activeScenarioId}
              onChange={(e) => handleTriggerScenario(e.target.value, 'triaged')}
              className="bg-[#09090b] border border-[#27272a] px-2.5 py-1.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-zinc-500"
            >
              {Object.values(INCIDENT_SCENARIOS).map((scen) => (
                <option key={scen.id} value={scen.id}>
                  {scen.name}
                </option>
              ))}
            </select>

            {roomState.incidentStatus === 'AWAITING_HUMAN_SIGNOFF' && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  handleSendRoomMessage(
                    `@ops-release Approved. Roll back to ${activeScenario.rollbackTargetVersion}`
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium bg-emerald-600 hover:bg-emerald-500 text-zinc-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Sign Off Rollback ({activeScenario.rollbackTargetVersion})</span>
              </button>
            )}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleTriggerScenario(roomState.activeScenarioId, 'nominal')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-[#09090b] hover:bg-zinc-800 text-zinc-300 border border-[#27272a] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Nominal</span>
            </button>
          </div>
        </section>

        {/* ===================================================================
            4-COLUMN TACTICAL METRIC STRIP (Full-Width Row, Tabular Numerals)
           =================================================================== */}
        <section
          aria-label="Live Incident Telemetry Metrics"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Metric 1: Incident Gate & Room State */}
          <div className="bg-[#18181b] border border-[#27272a] p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Switch Room State</span>
              {isResolved ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : isCritical ? (
                <Clock className="w-4 h-4 text-amber-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-zinc-400" />
              )}
            </div>
            <div
              data-testid="incident-status-value"
              className={`text-lg font-mono font-bold tabular-nums ${
                isResolved
                  ? 'text-emerald-400'
                  : roomState.incidentStatus === 'AWAITING_HUMAN_SIGNOFF'
                  ? 'text-amber-400'
                  : 'text-zinc-100'
              }`}
            >
              {roomState.incidentStatus}
            </div>
            <div className="text-xs font-mono text-zinc-400">
              Active Release: {roomState.currentVersion} · Target: {roomState.targetRollbackVersion}
            </div>
          </div>

          {/* Metric 2: Checkout HTTP 500 Rate & p99 Latency */}
          <div className="bg-[#18181b] border border-[#27272a] p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Endpoint HTTP 500 Rate</span>
              <AlertOctagon
                className={`w-4 h-4 ${
                  roomState.metrics.http500RatePct > 1
                    ? 'text-rose-500'
                    : 'text-emerald-400'
                }`}
              />
            </div>
            <div
              data-testid="http-500-rate-value"
              className={`text-2xl font-mono font-bold tabular-nums ${
                roomState.metrics.http500RatePct > 1
                  ? 'text-rose-400'
                  : 'text-emerald-400'
              }`}
            >
              {roomState.metrics.http500RatePct.toFixed(2)}%
            </div>
            <div className="text-xs font-mono text-zinc-400 tabular-nums">
              {activeScenario.endpoint} · p99: {roomState.metrics.p99LatencyMs}ms
            </div>
          </div>

          {/* Metric 3: Revenue Burn / Protected */}
          <div className="bg-[#18181b] border border-[#27272a] p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>
                {roomState.metrics.revenueAtRiskPerMinUsd > 0
                  ? 'Revenue Exposure Burn'
                  : 'Projected Outage Burn Saved'}
              </span>
              <span className="font-mono text-xs text-zinc-400">USD</span>
            </div>
            <div
              data-testid="revenue-metric-value"
              className={`text-2xl font-mono font-bold tabular-nums ${
                roomState.metrics.revenueAtRiskPerMinUsd > 0
                  ? 'text-rose-400'
                  : 'text-emerald-400'
              }`}
            >
              {roomState.metrics.revenueAtRiskPerMinUsd > 0
                ? `$${roomState.metrics.revenueAtRiskPerMinUsd.toLocaleString('en-US')}/min`
                : `$${roomState.metrics.accumulatedRevenueSavedUsd.toLocaleString('en-US')}`}
            </div>
            <div className="text-xs font-mono text-zinc-400">
              Regions: {activeScenario.affectedRegions.join(', ')}
            </div>
          </div>

          {/* Metric 4: Rollback Risk Score & DB Pool Utilization */}
          <div className="bg-[#18181b] border border-[#27272a] p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Rollback Risk & PG Pool</span>
              <span className="font-mono text-emerald-400">
                {roomState.metrics.rollbackRiskLabel} RISK
              </span>
            </div>
            <div className="text-2xl font-mono font-bold text-zinc-100 tabular-nums">
              {roomState.metrics.rollbackRiskScore.toFixed(2)}{' '}
              <span className="text-sm font-normal text-zinc-400">
                · Pool {roomState.metrics.dbPoolUtilizationPct}%
              </span>
            </div>
            <div className="text-xs font-mono text-zinc-400">
              Zero DB migrations · Stateless swap to {activeScenario.rollbackTargetVersion}
            </div>
          </div>
        </section>

        {/* ===================================================================
            PRIMARY 2-COLUMN WORKSPACE:
            Left: Switch Room & Multi-Agent Chat (SSE In / HTTP Out)
            Right: Diagnostic Evidence, Git Diff, DB Pool & Repro Script
           =================================================================== */}
        <div
          id="switch-room-workspace"
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
        >
          <div className="lg:col-span-6 flex flex-col">
            <SwitchRoomChatPane
              roomState={roomState}
              activeScenario={activeScenario}
              onSendMessage={handleSendRoomMessage}
              onSelectChatAdapter={handleSelectChatAdapter}
              isSubmitting={isSubmitting}
            />
          </div>

          <div className="lg:col-span-6 flex flex-col">
            <DiagnosticsDiffPane
              roomState={roomState}
              activeScenario={activeScenario}
            />
          </div>
        </div>

        {/* ===================================================================
            AUDIT LEDGER (AGENT DECISIONS VS HUMAN APPROVALS) & LOG STREAM
           =================================================================== */}
        <div id="audit-telemetry-section">
          <AuditAndLogsPane
            auditDecisions={roomState.auditDecisions}
            telemetryLogs={roomState.telemetryLogs}
          />
        </div>

        {/* ===================================================================
            DELIVERABLES & SUBMISSION KIT VIEWER
           =================================================================== */}
        <div id="deliverables-section">
          <DeliverablesModalView deliverables={deliverables} />
        </div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="border-t border-[#27272a] bg-[#09090b] px-6 py-4 mt-6">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400">
          <span>
            Sentinel · Autonomous Multi-Agent Incident & Rollback Workflow built on Switch
          </span>
          <span className="font-mono">
            Files in Repo: sentinel.template.yaml · docker-compose.yml · server.ts · README.md
          </span>
        </div>
      </footer>
    </div>
  );
}
