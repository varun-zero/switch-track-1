import React, { useState } from 'react';
import { FileText, Copy, Check, Download, Video, Mic } from 'lucide-react';

export interface DeliverablesBundle {
  templateYaml: string;
  dockerCompose: string;
  readmeMd: string;
  agentServerCode: string;
  engineLogicCode: string;
}

interface DeliverablesModalViewProps {
  deliverables: DeliverablesBundle | null;
}

export const DeliverablesModalView: React.FC<DeliverablesModalViewProps> = ({
  deliverables,
}) => {
  const [selectedDoc, setSelectedDoc] = useState<
    'templateYaml' | 'dockerCompose' | 'agentServerCode' | 'readmeMd' | 'demoScript'
  >('templateYaml');
  const [copied, setCopied] = useState(false);

  const getActiveContent = (): { filename: string; content: string } => {
    if (!deliverables) {
      return { filename: 'loading...', content: 'Loading deliverables from disk...' };
    }
    switch (selectedDoc) {
      case 'templateYaml':
        return { filename: 'sentinel.template.yaml', content: deliverables.templateYaml };
      case 'dockerCompose':
        return { filename: 'docker-compose.yml', content: deliverables.dockerCompose };
      case 'agentServerCode':
        return { filename: 'server.ts (Switch SSE/HTTP Agent Protocol)', content: deliverables.agentServerCode };
      case 'readmeMd':
        return { filename: 'README.md', content: deliverables.readmeMd };
      case 'demoScript':
        return {
          filename: '2-Minute-Walkthrough-Script.md',
          content: `# 2-Minute Video Walkthrough Script & Wispr Flow Voice Guide\n\n` + deliverables.readmeMd,
        };
    }
  };

  const activeFile = getActiveContent();

  const handleCopy = () => {
    navigator.clipboard?.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.filename.split(' ')[0];
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      aria-label="Hackathon Deliverables & Submission Kit"
      className="bg-[#18181b] border border-[#27272a] rounded-sm overflow-hidden"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#27272a] bg-[#09090b]/60">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-100">
            Hackathon Deliverables & Submission Kit (Track 01: Best Business Workflow)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-[#09090b] hover:bg-zinc-800 text-zinc-200 border border-[#27272a] transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied {activeFile.filename}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy File</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-zinc-100 hover:bg-white text-zinc-950 font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {activeFile.filename.split(' ')[0]}</span>
          </button>
        </div>
      </div>

      {/* Deliverable File Selector Tabs */}
      <div className="px-4 py-2.5 border-b border-[#27272a] bg-[#09090b] flex flex-wrap items-center gap-1.5">
        {(
          [
            { id: 'templateYaml', label: '1. sentinel.template.yaml' },
            { id: 'agentServerCode', label: '2. server.ts (SSE/HTTP Protocol)' },
            { id: 'dockerCompose', label: '3. docker-compose.yml' },
            { id: 'readmeMd', label: '4. README.md & Reproduction' },
            { id: 'demoScript', label: '5. 2-Min Demo Script & Wispr Flow' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedDoc(tab.id)}
            className={`px-3 py-1.5 text-xs font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedDoc === tab.id
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-600'
                : 'bg-[#18181b] text-zinc-400 border border-[#27272a] hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Interactive 2-Minute Video Script Teleprompter Card when Demo Script tab is active */}
      {selectedDoc === 'demoScript' && (
        <div className="p-4 border-b border-[#27272a] bg-[#09090b] grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-3.5 border border-[#27272a] bg-[#18181b] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-100">
              <Video className="w-4 h-4 text-emerald-400" />
              <span>2-Minute Hackathon Video Walkthrough Cue Sheet</span>
            </div>
            <div className="space-y-2 text-xs text-zinc-300 leading-relaxed">
              <p>
                <strong className="font-mono text-zinc-100">0:00–0:20 [Problem & Topology]:</strong>{' '}
                Show Mattermost channel and Sentinel HUD side-by-side. Highlight Switch Core brokering SSE/HTTP events between Sentry, Git, and 3 agents.
              </p>
              <p>
                <strong className="font-mono text-zinc-100">0:20–0:45 [@ops-triager]:</strong>{' '}
                Trigger the Checkout 500 spike (`v2.14.0`). Point out the strict 2-line blast radius summary quantifying `$14,200/min` exposure and commit `8f9d2a1`.
              </p>
              <p>
                <strong className="font-mono text-zinc-100">0:45–1:15 [@ops-repro]:</strong>{' '}
                Show `owner-agents` handoff. Inspect PostgreSQL pool (`42/200 active, 1.8ms p95`), the `stripeIntent.ts` diff, and `repro_checkout_500.ts`.
              </p>
              <p>
                <strong className="font-mono text-zinc-100">1:15–2:00 [@ops-release + Human Gate]:</strong>{' '}
                Show `RULE-03` halting execution at Risk `0.08 LOW`. Dictate via Wispr Flow: `"@ops-release Approved. Roll back to v2.13.2"`. Watch 500s drop to `0.01%`.
              </p>
            </div>
          </div>

          <div className="p-3.5 border border-[#27272a] bg-[#18181b] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-100">
              <Mic className="w-4 h-4 text-amber-400" />
              <span>Wispr Flow Voice Dictation Side-Track Design</span>
            </div>
            <div className="space-y-2 text-xs text-zinc-300 leading-relaxed">
              <p>
                During high-severity outages, typing exact `@` handles and semantic version punctuation slows down incident commanders.
              </p>
              <p className="font-mono text-zinc-200 bg-[#09090b] p-2 border border-[#27272a]">
                Spoken: "ops release approved roll back to version 2 point 13 point 2"
                <br />
                Normalized: "@ops-release Approved. Roll back to v2.13.2"
              </p>
              <p>
                `parseRoomCommand()` in `src/logic/sentinelEngine.ts` automatically normalizes spoken Wispr Flow tokens into canonical Switch room addressing triggers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Code / File Content Viewer */}
      <div className="bg-[#09090b] overflow-x-auto max-h-[540px]">
        <div className="px-4 py-2 border-b border-[#27272a] flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>File: /{activeFile.filename}</span>
          <span>UTF-8 · Production Ready</span>
        </div>
        <pre className="p-4 text-xs font-mono leading-relaxed text-zinc-200 overflow-x-auto">
          {activeFile.content}
        </pre>
      </div>
    </section>
  );
};
