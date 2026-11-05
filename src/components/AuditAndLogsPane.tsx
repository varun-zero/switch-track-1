import React, { useState } from 'react';
import { ShieldCheck, Activity, Search } from 'lucide-react';
import { AuditDecisionEntry, TelemetryLogEntry } from '../logic/sentinelEngine';

interface AuditAndLogsPaneProps {
  auditDecisions: AuditDecisionEntry[];
  telemetryLogs: TelemetryLogEntry[];
}

export const AuditAndLogsPane: React.FC<AuditAndLogsPaneProps> = ({
  auditDecisions,
  telemetryLogs,
}) => {
  const [logFilter, setLogFilter] = useState<'ALL' | 'ERROR' | 'PROTOCOL' | 'WARN' | 'INFO'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actorFilter, setActorFilter] = useState<'ALL' | 'AGENT_DECISION' | 'HUMAN_APPROVAL'>('ALL');

  const filteredLogs = telemetryLogs.filter((entry) => {
    const matchesLevel = logFilter === 'ALL' || entry.level === logFilter;
    const matchesQuery =
      !searchQuery.trim() ||
      entry.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.traceId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesQuery;
  });

  const filteredAudit = auditDecisions.filter((d) => {
    return actorFilter === 'ALL' || d.actorType === actorFilter;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      {/* Left 7 Columns: Audit Log of Agent Decisions vs. Human Approvals */}
      <section
        aria-label="Audit Log of Agent Decisions vs Human Approvals"
        className="lg:col-span-7 bg-[#18181b] border border-[#27272a] rounded-sm flex flex-col"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#27272a] bg-[#09090b]/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0" />
            <h2 className="text-sm font-semibold text-zinc-100">
              03. Audit Ledger: Agent Decisions vs. Human Approvals
            </h2>
          </div>

          <div
            role="group"
            aria-label="Filter Audit Ledger by Actor Type"
            className="flex items-center gap-1 bg-[#09090b] p-0.5 border border-[#27272a] rounded-sm"
          >
            {(
              [
                { id: 'ALL', label: 'All Entries' },
                { id: 'AGENT_DECISION', label: 'Agent Decisions' },
                { id: 'HUMAN_APPROVAL', label: 'Human Approvals' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActorFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  actorFilter === tab.id
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#27272a] bg-[#09090b] text-zinc-400 font-mono">
                <th className="py-2.5 px-3 font-medium">Timestamp</th>
                <th className="py-2.5 px-3 font-medium">Actor / Type</th>
                <th className="py-2.5 px-3 font-medium">Action & Target</th>
                <th className="py-2.5 px-3 font-medium">Evidence & Rationale</th>
                <th className="py-2.5 px-3 font-medium text-right">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {filteredAudit.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-zinc-400 font-mono">
                    No matching audit records yet. Trigger or approve the rollback in the Switch room to record human authorization.
                  </td>
                </tr>
              ) : (
                filteredAudit.map((entry) => {
                  const isHuman = entry.actorType === 'HUMAN_APPROVAL';
                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-zinc-900/50 transition-colors ${
                        isHuman ? 'bg-emerald-950/15' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-zinc-400 tabular-nums whitespace-nowrap">
                        {entry.timestamp}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono font-semibold text-zinc-100">
                          {entry.actorName}
                        </div>
                        <div className="font-mono text-[11px] text-zinc-400">
                          {isHuman ? 'HUMAN_APPROVAL' : 'AGENT_DECISION'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                        <div className="text-zinc-200">{entry.action}</div>
                        <div className="text-zinc-400">
                          target:{entry.targetVersion} · {entry.verificationHash}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-300 max-w-xs">
                        {entry.rationale}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right whitespace-nowrap tabular-nums">
                        <span
                          className={
                            entry.status === 'AUTHORIZED' || entry.status === 'EXECUTED'
                              ? 'text-emerald-400 font-semibold'
                              : entry.status === 'PROPOSED'
                              ? 'text-amber-400 font-semibold'
                              : entry.status === 'REJECTED'
                              ? 'text-rose-400 font-semibold'
                              : 'text-zinc-300'
                          }
                        >
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Right 5 Columns: Real-Time SSE & Telemetry Log Feed */}
      <section
        aria-label="Real-Time Switch SSE and Telemetry Log Stream"
        className="lg:col-span-5 bg-[#18181b] border border-[#27272a] rounded-sm flex flex-col"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[#27272a] bg-[#09090b]/60">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-400 shrink-0" />
            <h2 className="text-sm font-semibold text-zinc-100">
              04. Real-Time Protocol & Telemetry Feed
            </h2>
          </div>

          <div
            role="group"
            aria-label="Filter Log Level"
            className="flex items-center gap-1 bg-[#09090b] p-0.5 border border-[#27272a] rounded-sm"
          >
            {(['ALL', 'ERROR', 'PROTOCOL', 'WARN', 'INFO'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLogFilter(lvl)}
                className={`px-2 py-0.5 text-[11px] font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  logFilter === lvl
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="px-3 py-2 border-b border-[#27272a] bg-[#09090b] flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <label htmlFor="telemetry-log-search" className="sr-only">
            Filter telemetry logs
          </label>
          <input
            id="telemetry-log-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter logs by trace ID, service, or exception..."
            className="w-full bg-transparent text-xs font-mono text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
          />
        </div>

        {/* Monospace Log Lines */}
        <div className="p-3 space-y-2 overflow-y-auto max-h-[290px] flex-1 bg-[#09090b]/50 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="py-6 text-center text-zinc-500">
              No telemetry logs match filter "{logFilter}".
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-2 border border-[#27272a] bg-[#09090b] leading-relaxed"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400 tabular-nums mb-0.5">
                  <span>
                    {log.timestamp} · {log.service} · {log.traceId}
                  </span>
                  <span
                    className={
                      log.level === 'ERROR'
                        ? 'text-rose-400 font-semibold'
                        : log.level === 'WARN'
                        ? 'text-amber-400 font-semibold'
                        : log.level === 'PROTOCOL'
                        ? 'text-emerald-400 font-semibold'
                        : 'text-zinc-300'
                    }
                  >
                    {log.level}
                  </span>
                </div>
                <div className="text-zinc-200 break-words">{log.message}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
