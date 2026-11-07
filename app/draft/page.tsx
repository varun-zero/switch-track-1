'use client';

import React from 'react';
import { useSignoff } from '@/context/SignoffContext';

export default function DraftPage() {
  const { state } = useSignoff();

  const sections = state?.draft ?? [];
  const fixPayClaimDone = state?.fixes?.find((f) => f.id === 'fix-pay-claim')?.done ?? false;

  const renderSectionContent = (content: string, isFirstSection: boolean) => {
    // If it's the first section and fixPayClaim is not done, highlight the unverified claim
    let text = content;
    const unverifiedTarget = 'Our graduates earned 30% more within a year.';

    // Replace [E#] citations with <span class="cite">E#</span>
    // Replace GAP... with <span class="gapm">GAP...</span>
    // Replace unverified claim with <span class="bad" title="No source for this claim">...</span>

    // We can split or tokenize the text
    const parts: React.ReactNode[] = [];
    let remaining = text;

    // Helper to process citations and gaps in a text chunk
    const processCitationsAndGaps = (chunk: string, keyPrefix: string): React.ReactNode[] => {
      // Matches [E#], E#, or GAP: ...
      const regex = /(\[?(E\d+)\]?|(?:GAP(?::\s*[^.<\n]+)?))/g;
      const subParts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(chunk)) !== null) {
        if (match.index > lastIndex) {
          subParts.push(chunk.substring(lastIndex, match.index));
        }

        const full = match[0];
        const evidenceCode = match[2];

        if (evidenceCode) {
          subParts.push(
            <span key={`${keyPrefix}-cite-${match.index}`} className="cite">
              {evidenceCode}
            </span>
          );
        } else if (full.startsWith('GAP')) {
          subParts.push(
            <span key={`${keyPrefix}-gap-${match.index}`} className="gapm">
              {full}
            </span>
          );
        }

        lastIndex = match.index + full.length;
      }

      if (lastIndex < chunk.length) {
        subParts.push(chunk.substring(lastIndex));
      }

      return subParts;
    };

    if (isFirstSection && !fixPayClaimDone && text.includes(unverifiedTarget)) {
      const idx = text.indexOf(unverifiedTarget);
      const before = text.substring(0, idx);
      const after = text.substring(idx + unverifiedTarget.length);

      parts.push(...processCitationsAndGaps(before, 'before'));
      parts.push(
        <span key="bad-claim" className="bad" title="No source for this claim">
          {unverifiedTarget}
        </span>
      );
      parts.push(...processCitationsAndGaps(after, 'after'));
    } else {
      parts.push(...processCitationsAndGaps(text, 'full'));
    }

    return parts;
  };

  return (
    <>
      <h1>The draft</h1>
      <p className="what">
        What is this? The Drafter agent wrote the application. Tags like <span className="cite">E4</span> show the source of a fact. <span className="gapm">GAP</span> means the proof is missing. The automatic checker marks claims with no source.
      </p>

      {sections.map((section, idx) => (
        <div key={section.id || idx} className="card">
          <h3>
            {section.title}{' '}
            <small>
              {section.wordCount} of {section.maxWords} words
            </small>
          </h3>
          <p>{renderSectionContent(section.content, idx === 0)}</p>
        </div>
      ))}
    </>
  );
}

