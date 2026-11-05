'use client';

import React from 'react';
import { useSignoff } from '@/context/SignoffContext';

export default function SignOffPage() {
  const { state, toggleFix, approveApplication } = useSignoff();

  const isApproved = state?.approved ?? false;
  const fixes = state?.fixes ?? [
    { id: 'fix-pay-claim', text: 'I added a source for the graduate pay claim.', done: false },
    { id: 'fix-board-list', text: 'I attached the board member list.', done: false },
  ];
  const decisionLog = state?.decisionLog ?? [];

  const allFixesDone = fixes.length > 0 && fixes.every((f) => f.done);

  const handleFixChange = (id: string, currentDone: boolean) => {
    if (isApproved) return;
    toggleFix(id, !currentDone);
  };

  const handleApproveClick = async () => {
    if (isApproved) return;
    await approveApplication();
  };

  return (
    <>
      <h1>Sign off</h1>
      <p className="what">
        What is this? Only you, the Approver, can approve. Agents can’t. Fix the two problems, then approve.
      </p>

      <div className="card">
        <h3>Before you approve</h3>
        {fixes.map((fix) => {
          const isChecked = isApproved || fix.done;
          return (
            <label key={fix.id} className="chk">
              <input
                type="checkbox"
                className="fx"
                checked={isChecked}
                disabled={isApproved}
                onChange={() => handleFixChange(fix.id, fix.done)}
              />{' '}
              {fix.text}
            </label>
          );
        })}

        <button
          className="btn"
          id="appr"
          aria-disabled={isApproved || !allFixesDone}
          disabled={isApproved}
          onClick={handleApproveClick}
        >
          {isApproved ? 'Approved' : 'Approve and save final file'}
        </button>
      </div>

      <div className="card">
        <h3>Who decided what</h3>
        <ul className="log" id="log">
          {decisionLog.map((item, idx) => (
            <li key={idx}>
              <b>{item.actor}</b> {item.action}
              <small>{item.timestamp}</small>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
