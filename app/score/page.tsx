'use client';

import React from 'react';
import { useSignoff } from '@/context/SignoffContext';

export default function ScorePage() {
  const { state } = useSignoff();

  const overallScore = state?.overallScore ?? 78;
  const rubricScores = state?.rubricScores ?? [
    { name: 'Need', score: 24, max: 30 },
    { name: 'Approach', score: 23, max: 30 },
    { name: 'Capacity', score: 16, max: 20 },
    { name: 'Budget', score: 15, max: 20 },
  ];
  const problems = state?.problems ?? [];

  return (
    <>
      <h1>Review score</h1>
      <p className="what">
        What is this? The Reviewer agent scored the draft with the funder’s scoring guide. It can only report. It can’t approve.
      </p>

      <div className="big">
        {overallScore}
        <span style={{ fontSize: '.35em' }}>/100</span>
      </div>

      <div className="rows" style={{ margin: '22px 0' }}>
        {rubricScores.map((r) => {
          const pct = Math.min(100, Math.max(0, (r.score / r.max) * 100));
          return (
            <div key={r.name}>
              <b>{r.name}</b>{' '}
              <span style={{ color: 'var(--mu)' }}>
                {r.score} of {r.max}
              </span>
              <div className="bar">
                <b style={{ width: `${pct}%` }}></b>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3>Problems found</h3>
        {problems.length === 0 ? (
          <p style={{ color: 'var(--ok)' }}>All problems resolved! Ready for final sign off.</p>
        ) : (
          <p>
            {problems.map((p, i) => {
              const text = p.replace(/^\d+\.\s*/, '');
              return (
                <React.Fragment key={i}>
                  {i + 1}. {text}
                  {i < problems.length - 1 && <br />}
                </React.Fragment>
              );
            })}
          </p>
        )}
      </div>
    </>
  );
}

