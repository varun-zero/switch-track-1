import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, CheckCircle2, AlertTriangle, ShieldAlert, Terminal } from 'lucide-react';
import { SwitchRoomState, IncidentScenario, parseRoomCommand } from '../logic/sentinelEngine';

interface SwitchRoomChatPaneProps {
  roomState: SwitchRoomState;
  activeScenario: IncidentScenario;
  onSendMessage: (message: string, operatorHandle?: string) => Promise<void>;
  onSelectChatAdapter: (adapter: 'Mattermost' | 'Slack' | 'Discord' | 'Teams') => void;
  isSubmitting: boolean;
}

export const SwitchRoomChatPane: React.FC<SwitchRoomChatPaneProps> = ({
  roomState,
  activeScenario,
  onSendMessage,
  onSelectChatAdapter,
  isSubmitting,
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [operatorHandle, setOperatorHandle] = useState('varun.sre (On-Call Lead)');
  const [wisprListening, setWisprListening] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [roomState.messages.length]);

  const parsedPreview = inputMessage.trim()
    ? parseRoomCommand(inputMessage, activeScenario.rollbackTargetVersion)
    : null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed) {
      setValidationError('Enter a room command or use a Wispr Flow voice preset.');
      return;
    }
    setValidationError(null);
    setInputMessage('');
    await onSendMessage(trimmed, operatorHandle);
  };

  const handleQuickCommand = async (cmd: string) => {
    setValidationError(null);
    await onSendMessage(cmd, operatorHandle);
  };

  const triggerWisprDictation = async () => {
    setValidationError(null);
    setWisprListening(true);
    const spokenTranscript = `ops release approved roll back to version ${activeScenario.rollbackTargetVersion
      .replace(/^v/, '')
      .split('.')
      .join(' point ')}`;
    setInputMessage(spokenTranscript);
    setTimeout(() => {
      setWisprListening(false);
    }, 650);
  };

  return (
    <section
      aria-label="Switch Room & Team Chat Stream"
      className="flex flex-col bg-[#18181b] border border-[#27272a] rounded-sm overflow-hidden"
    >
      {/* Room Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#27272a] bg-[#09090b]/60">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="w-4 h-4 text-zinc-400 shrink-0" />
          <h2 className="text-sm font-semibold text-zinc-100 truncate">
            Switch Room: {roomState.roomName}
          </h2>
          <span className="text-xs text-zinc-500 font-mono shrink-0">
            · {roomState.channelName}
          </span>
        </div>

        {/* Chat Bridge Selector (Interactive segmented control) */}
        <div
          role="group"
          aria-label="Team Chat Bridge Adapter"
          className="flex items-center gap-1 bg-[#09090b] p-0.5 border border-[#27272a] rounded-sm"
        >
          {(['Mattermost', 'Slack', 'Discord', 'Teams'] as const).map((adapter) => (
            <button
              key={adapter}
              type="button"
              onClick={() => onSelectChatAdapter(adapter)}
              className={`px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 rounded-xs ${
                roomState.chatAdapter === adapter
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {adapter}
            </button>
          ))}
        </div>
      </div>

      {/* Strict 2-Line Blast Radius Summary Banner (Mandated by RULE-01) */}
      <div className="px-4 py-3 border-b border-[#27272a] bg-[#09090b]">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-xs font-semibold text-zinc-300">
            01. Blast Radius Summary (@ops-triager · Strict 2-Line Rule)
          </span>
          <span className="text-xs font-mono text-zinc-400 tabular-nums">
            Commit {activeScenario.offendingCommit} · {activeScenario.offendingVersion}
          </span>
        </div>
        <div className="font-mono text-xs leading-relaxed text-zinc-200 space-y-1 bg-[#18181b] p-2.5 border border-[#27272a]">
          <p className="text-zinc-100">{roomState.blastRadiusTwoLineSummary[0]}</p>
          <p className="text-zinc-300">{roomState.blastRadiusTwoLineSummary[1]}</p>
        </div>
      </div>

      {/* Room Messages Stream */}
      <div
        ref={messagesContainerRef}
        data-testid="switch-room-messages"
        className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[430px] min-h-[320px] bg-[#09090b]/30"
      >
        {roomState.messages.map((msg) => {
          const isHuman = msg.senderId === 'human-operator';
          const isRelease = msg.senderId === 'ops-release';

          return (
            <article
              key={msg.id}
              className={`p-3.5 border transition-colors ${
                isHuman
                  ? 'bg-[#18181b] border-emerald-500/40'
                  : isRelease && roomState.incidentStatus === 'AWAITING_HUMAN_SIGNOFF'
                  ? 'bg-[#18181b] border-amber-500/40'
                  : 'bg-[#18181b] border-[#27272a]'
              }`}
            >
              {/* Message Metadata Line (Unboxed typography per Zero-Pill rule) */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span className="font-mono font-semibold text-zinc-100">
                    @{msg.senderDisplay}
                  </span>
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span className="font-mono text-zinc-400">{msg.roleBadge}</span>
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span className="font-mono text-zinc-400">
                    mode:{msg.addressingMode}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-zinc-400 tabular-nums">
                  <span>{msg.protocolMeta.sseEventId}</span>
                  <span aria-hidden="true">·</span>
                  <span>{msg.protocolMeta.transport}</span>
                  <span aria-hidden="true">·</span>
                  <span>{msg.protocolMeta.latencyMs}ms</span>
                  <span aria-hidden="true">·</span>
                  <span>{msg.timestamp}</span>
                </div>
              </div>

              {/* Message Body */}
              <div className="text-xs leading-relaxed text-zinc-200 whitespace-pre-line font-sans">
                {msg.content}
              </div>

              {/* Optional Inline Diff / Code Artifact */}
              {msg.codeSnippet && (
                <div className="mt-2.5 border border-[#27272a] bg-[#09090b] overflow-x-auto">
                  <div className="px-3 py-1.5 border-b border-[#27272a] flex items-center justify-between text-xs font-mono text-zinc-400">
                    <span>{msg.codeSnippet.filename}</span>
                    <span>{msg.codeSnippet.language}</span>
                  </div>
                  <pre className="p-3 text-xs font-mono leading-relaxed text-zinc-200 overflow-x-auto">
                    {msg.codeSnippet.code}
                  </pre>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Human-in-the-Loop Action Banner & Wispr Flow Voice Console */}
      <div className="p-4 border-t border-[#27272a] bg-[#18181b] space-y-3">
        {/* Status / Gate Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {roomState.incidentStatus === 'AWAITING_HUMAN_SIGNOFF' ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-medium text-amber-300">
                  Gate RULE-03 Active: Waiting for human sign-off to roll back to{' '}
                  <code className="font-mono">{activeScenario.rollbackTargetVersion}</code>
                </span>
              </>
            ) : roomState.incidentStatus === 'RESOLVED' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium text-emerald-300">
                  Rollback Executed: Production serving{' '}
                  <code className="font-mono">{roomState.currentVersion}</code> (HTTP 500s at 0.01%)
                </span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="text-zinc-300">
                  Switch Agent Protocol Connected · Operator: {operatorHandle}
                </span>
              </>
            )}
          </div>

          {/* Operator Identity Input */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="operator-handle-input" className="text-xs text-zinc-400">
              Operator:
            </label>
            <input
              id="operator-handle-input"
              type="text"
              value={operatorHandle}
              onChange={(e) => setOperatorHandle(e.target.value)}
              className="bg-[#09090b] border border-[#27272a] px-2 py-1 text-xs font-mono text-zinc-200 rounded-xs w-44 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        {/* One-Click Tactical Commands & Wispr Flow Voice Preset */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() =>
              handleQuickCommand(
                `@ops-release Approved. Roll back to ${activeScenario.rollbackTargetVersion}`
              )
            }
            className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            Approve Rollback ({activeScenario.rollbackTargetVersion})
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={triggerWisprDictation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#09090b] hover:bg-zinc-800 text-zinc-200 border border-[#27272a] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {wisprListening ? 'Dictating via Wispr Flow...' : 'Dictate via Wispr Flow'}
            </span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() =>
              handleQuickCommand(`@ops-repro Verify database pool and re-run reproduction script`)
            }
            className="px-3 py-1.5 text-xs font-medium bg-[#09090b] hover:bg-zinc-800 text-zinc-300 border border-[#27272a] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Ask @ops-repro
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() =>
              handleQuickCommand(
                `@ops-release Hold rollback to ${activeScenario.rollbackTargetVersion}`
              )
            }
            className="px-3 py-1.5 text-xs font-medium bg-[#09090b] hover:bg-zinc-800 text-zinc-300 border border-[#27272a] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Hold Rollback
          </button>
        </div>

        {/* Chat Input Form */}
        <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
          <label htmlFor="switch-chat-input" className="sr-only">
            Message Switch Incident Room
          </label>
          <input
            id="switch-chat-input"
            type="text"
            value={inputMessage}
            onChange={(e) => {
              setInputMessage(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder={`Reply in ${roomState.channelName}: e.g. @ops-release Approved. Roll back to ${activeScenario.rollbackTargetVersion}`}
            className="flex-1 bg-[#09090b] border border-[#27272a] px-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send to Room</span>
          </button>
        </form>

        {parsedPreview && (
          <div className="text-[11px] font-mono text-zinc-400 flex flex-wrap items-center justify-between gap-2 bg-[#09090b] px-2.5 py-1.5 border border-[#27272a]">
            <span>
              Wispr/Switch Parser: <strong className="text-zinc-200">{parsedPreview.normalizedText}</strong>
            </span>
            <span className="text-emerald-400">
              Intent: {parsedPreview.intent} · Target: @{parsedPreview.addressedAgent ?? 'room'}
            </span>
          </div>
        )}

        {validationError && (
          <p role="alert" className="text-xs text-rose-400 font-mono">
            {validationError}
          </p>
        )}
      </div>
    </section>
  );
};
