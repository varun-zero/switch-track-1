import React, { useState } from 'react';
import { GitCommit, Database, FileCode2, ListChecks, Check, Copy } from 'lucide-react';
import { SwitchRoomState, IncidentScenario } from '../logic/sentinelEngine';

interface DiagnosticsDiffPaneProps {
  roomState: SwitchRoomState;
  activeScenario: IncidentScenario;
}

export const DiagnosticsDiffPane: React.FC<DiagnosticsDiffPaneProps> = ({
  roomState,
  activeScenario,
}) => {
  const [activeTab, setActiveTab] = useState<'diff' | 'repro' | 'tasks'>('diff');
  const [copiedRepro, setCopiedRepro] = useState(false);

  const handleCopyRepro = () => {
    navigator.clipboard?.writeText(activeScenario.reproScript.code);
    setCopiedRepro(true);
    setTimeout(() => setCopiedRepro(false), 1800);
  };

  return (
    <section
      aria-label="Diagnostic Evidence & Diff Inspector"
      className="flex flex-col bg-[#18181b] border border-[#27272a] rounded-sm overflow-hidden"
    >
      {/* Header & Interactive Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#27272a] bg-[#09090b]/60">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-zinc-400 shrink-0" />
          <h2 className="text-sm font-semibold text-zinc-100">
            02. Diagnostic Evidence & Room State
          </h2>
        </div>

        <div
          role="tablist"
          aria-label="Diagnostic Evidence Views"
          className="flex items-center gap-1 bg-[#09090b] p-0.5 border border-[#27272a] rounded-sm"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'diff'}
            type="button"
            onClick={() => setActiveTab('diff')}
            className={`px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'diff'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Git Diff & DB Health
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'repro'}
            type="button"
            onClick={() => setActiveTab('repro')}
            className={`px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'repro'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Isolated Repro Script
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'tasks'}
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Switch Room Tasks ({roomState.tasks.filter((t) => t.status === 'completed').length}/
            {roomState.tasks.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Git Diff + PostgreSQL Pool Telemetry */}
      {activeTab === 'diff' && (
        <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Commit Metadata Summary */}
            <div className="p-3 bg-[#09090b] border border-[#27272a] space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <span className="text-zinc-100 font-semibold">
                  Offending Deploy: {activeScenario.offendingVersion} (SHA{' '}
                  {activeScenario.offendingCommit})
                </span>
                <span className="text-zinc-400">
                  Author: {activeScenario.commitAuthor} · {activeScenario.commitTimestamp}
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-300">
                {activeScenario.commitMessage}
              </p>
              <p className="text-xs font-mono text-rose-400">
                Exception: {activeScenario.exceptionType}: {activeScenario.exceptionMessage}
              </p>
            </div>

            {/* Unified Diff Viewer */}
            <div className="border border-[#27272a] bg-[#09090b]">
              <div className="px-3 py-2 border-b border-[#27272a] flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>{activeScenario.gitDiff.filename}</span>
                <span>
                  {activeScenario.rollbackTargetCommit} ({activeScenario.rollbackTargetVersion})..
                  {activeScenario.offendingCommit} ({activeScenario.offendingVersion})
                </span>
              </div>
              <pre className="p-3 text-xs font-mono leading-relaxed overflow-x-auto">
                {activeScenario.gitDiff.patch.split('\n').map((line, idx) => {
                  const isAdd = line.startsWith('+') && !line.startsWith('+++');
                  const isDel = line.startsWith('-') && !line.startsWith('---');
                  const isHunk = line.startsWith('@@');
                  return (
                    <div
                      key={idx}
                      className={`px-2 py-0.5 ${
                        isAdd
                          ? 'bg-rose-950/50 text-rose-200'
                          : isDel
                          ? 'bg-emerald-950/40 text-emerald-300'
                          : isHunk
                          ? 'text-zinc-400 bg-zinc-900/60'
                          : 'text-zinc-300'
                      }`}
                    >
                      {line}
                    </div>
                  );
                })}
              </pre>
            </div>
          </div>

          {/* PostgreSQL Connection Pool Verification Matrix (@ops-repro) */}
          <div className="border border-[#27272a] bg-[#09090b] p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>PostgreSQL Primary Pool Health (Verified by @ops-repro)</span>
              </div>
              <span className="text-xs font-mono text-emerald-400">
                STATUS: HEALTHY (Not DB Bottleneck)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-[#27272a] text-xs font-mono tabular-nums">
              <div>
                <div className="text-zinc-400">Active / Max Conn</div>
                <div className="text-zinc-100 font-semibold mt-0.5">
                  {activeScenario.dbPoolStatus.activeConnections} /{' '}
                  {activeScenario.dbPoolStatus.maxConnections}
                </div>
              </div>
              <div>
                <div className="text-zinc-400">Idle Connections</div>
                <div className="text-zinc-100 font-semibold mt-0.5">
                  {activeScenario.dbPoolStatus.idleConnections}
                </div>
              </div>
              <div>
                <div className="text-zinc-400">Query Latency (p95)</div>
                <div className="text-emerald-400 font-semibold mt-0.5">
                  {activeScenario.dbPoolStatus.p95QueryMs} ms
                </div>
              </div>
              <div>
                <div className="text-zinc-400">Lock Waits / Deadlocks</div>
                <div className="text-emerald-400 font-semibold mt-0.5">
                  {activeScenario.dbPoolStatus.lockWaitCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Isolated Reproduction Script & Sandbox Output */}
      {activeTab === 'repro' && (
        <div className="p-4 space-y-4 flex-1">
          <div className="border border-[#27272a] bg-[#09090b]">
            <div className="px-3 py-2 border-b border-[#27272a] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-zinc-300">
                <FileCode2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>{activeScenario.reproScript.filename}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyRepro}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
              >
                {copiedRepro ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Script</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 text-xs font-mono leading-relaxed text-zinc-200 overflow-x-auto">
              {activeScenario.reproScript.code}
            </pre>
          </div>

          <div className="border border-[#27272a] bg-[#09090b]">
            <div className="px-3 py-2 border-b border-[#27272a] flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Sandbox Execution Output (@ops-repro)</span>
              <span className="text-amber-400">
                v2.14.0 Exit Code: {activeScenario.reproScript.exitCode} · v2.13.2 Exit Code: 0
              </span>
            </div>
            <pre className="p-3 text-xs font-mono leading-relaxed text-zinc-300 overflow-x-auto whitespace-pre-wrap">
              {activeScenario.reproScript.output}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 3: Switch Room Tasks & Agent Addressing Rules */}
      {activeTab === 'tasks' && (
        <div className="p-4 space-y-4 flex-1">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
              <ListChecks className="w-4 h-4 text-zinc-400" />
              <span>Shared Switch Room Task Ledger</span>
            </div>
            <div className="border border-[#27272a] divide-y divide-[#27272a] bg-[#09090b]">
              {roomState.tasks.map((task) => (
                <div
                  key={task.id}
                  className="px-3 py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-zinc-400">
                      {task.id} · Assignee: @{task.assignee} · Updated {task.updatedAt}
                    </div>
                    <div className="text-zinc-100 font-medium mt-0.5">{task.title}</div>
                  </div>
                  <span
                    className={`font-mono text-xs shrink-0 ${
                      task.status === 'completed'
                        ? 'text-emerald-400'
                        : task.status === 'blocked_on_human'
                        ? 'text-amber-400'
                        : 'text-zinc-400'
                    }`}
                  >
                    {task.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#27272a] bg-[#09090b] p-3 space-y-2">
            <div className="text-xs font-semibold text-zinc-200">
              Switch Room Rules & Addressing Boundaries (sentinel.template.yaml)
            </div>
            <ul className="space-y-1.5 text-xs font-mono text-zinc-300">
              <li>
                RULE-01 (@ops-triager · mode:anyone): Summarize blast radius in strictly 2 lines with $/min burn.
              </li>
              <li>
                RULE-02 (@ops-repro · mode:owner-agents): Verify PostgreSQL pool health & run sandbox repro script.
              </li>
              <li>
                RULE-03 (@ops-release · mode:human-gated): Block deploy.trigger_rollback until human signs off in room.
              </li>
              <li>
                RULE-04 (Wispr Flow Voice): Accept natural voice transcripts for hands-free incident approval.
              </li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
};
