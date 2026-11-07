'use client';

import React from 'react';
import { useSignoff } from '@/context/SignoffContext';

export default function ChecklistPage() {
  const { state, loading } = useSignoff();

  const requirements = state?.requirements ?? [];

  return (
    <>
      <h1>Requirements checklist</h1>
      <p className="what">
        What is this? The Analyst agent read the funder’s rules and listed everything the application needs. Each row shows if we have proof.
      </p>

      <div className="card scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>What the funder wants</th>
              <th>Required?</th>
              <th>Our proof</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && requirements.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--mu)' }}>
                  Loading requirements…
                </td>
              </tr>
            ) : (
              requirements.map((r, i) => (
                <tr key={r.id || i}>
                  <td>{r.num || i + 1}</td>
                  <td>{r.text}</td>
                  <td>{r.required ? 'Yes' : 'No'}</td>
                  <td>{r.proof}</td>
                  <td>
                    <span className={`pill ${r.status}`}>{r.statusText}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

