'use client';

import React, { useEffect, useState, useRef } from 'react';
import { sceneFrame } from '@/lib/scene';

interface Member {
  id: string;
  name: string;
  cls: string;
}

interface ChatItem {
  time: number;
  id: string;
  author: string;
  badge: string;
  avatarCls: string;
  text: string;
}

const MEMBERS: Member[] = [
  { id: 'M', name: 'Maya (client)', cls: '' },
  { id: 'Y', name: 'You (approver)', cls: '' },
  { id: 'A', name: 'Analyst', cls: 'ag' },
  { id: 'D', name: 'Drafter', cls: 'ag' },
  { id: 'R', name: 'Reviewer', cls: 'ag' },
  { id: 'C', name: 'Checker', cls: 'ag' },
];

const CHAT: ChatItem[] = [
  {
    time: 0,
    id: 'M',
    author: 'Maya',
    badge: '',
    avatarCls: '',
    text: '@Analyst here are the grant rules and our proof files.',
  },
  {
    time: 0.4,
    id: 'A',
    author: 'Analyst',
    badge: 'AGENT',
    avatarCls: 'ag',
    text: '@You I made the checklist. One problem: audited financials are required, but we only have a sponsor letter.',
  },
  {
    time: 0.75,
    id: 'Y',
    author: 'You',
    badge: '',
    avatarCls: '',
    text: 'Use the sponsor’s audit (E7). Go ahead.',
  },
  {
    time: 1.5,
    id: 'D',
    author: 'Drafter',
    badge: 'AGENT',
    avatarCls: 'ag',
    text: '@Checker the draft is ready. Two spots are marked as gaps.',
  },
  {
    time: 2.5,
    id: 'C',
    author: 'Checker',
    badge: 'TOOL',
    avatarCls: 'ag',
    text: 'Found 1 claim with no source: the graduate pay line.',
  },
  {
    time: 2.72,
    id: 'D',
    author: 'Drafter',
    badge: 'AGENT',
    avatarCls: 'ag',
    text: 'Fixed. I added the source.',
  },
  {
    time: 3.55,
    id: 'R',
    author: 'Reviewer',
    badge: 'AGENT',
    avatarCls: 'ag',
    text: '@You the score is 78 out of 100. I can’t approve. That is your call.',
  },
  {
    time: 4.72,
    id: 'Y',
    author: 'You',
    badge: '',
    avatarCls: '',
    text: 'Approved. Thank you all.',
  },
];

export default function SceneAnimation() {
  const [html, setHtml] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [activeMemberId, setActiveMemberId] = useState<string>('');
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const lastCountRef = useRef<number>(-1);

  const renderMessageText = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="at">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  useEffect(() => {
    const updateChat = (q: number) => {
      const v = CHAT.filter((m) => q >= m.time);
      const n = v.length;
      if (n === lastCountRef.current) return;
      lastCountRef.current = n;
      const lastMsg = v[n - 1];

      setMessages(v.slice(-5));
      setActiveMemberId(lastMsg ? lastMsg.id : '');
    };

    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isReducedMotion) {
      const frame = sceneFrame(12);
      setHtml(frame.html);
      setCaption(frame.cap);
      updateChat(frame.q);
      return;
    }

    const t0 = Date.now();
    const initial = sceneFrame(0);
    setHtml(initial.html);
    setCaption(initial.cap);
    updateChat(initial.q);

    const intervalId = setInterval(() => {
      const elapsed = (Date.now() - t0) / 1000;
      const frame = sceneFrame(elapsed);
      setHtml(frame.html);
      setCaption(frame.cap);
      updateChat(frame.q);
    }, 70);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="scenebox">
      <h2>Watch one document go through</h2>

      <div className="sl">
        <pre
          id="scene"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <p
          id="scap"
          style={{
            margin: 0,
            fontWeight: 500,
            minHeight: '3.2em',
            textAlign: 'center',
            width: '100%',
          }}
        >
          {caption}
        </p>
      </div>

      <div className="room">
        <div className="rh">
          <span># grant-room</span>
          <span className="sw">
            <i></i>Switch on
          </span>
        </div>

        <div className="mem">
          {MEMBERS.map((m) => (
            <div
              key={m.id}
              className={`m ${activeMemberId === m.id ? 'on' : ''}`}
              data-id={m.id}
            >
              <div className={`av ${m.cls}`}>{m.id}</div>
              {m.name}
            </div>
          ))}
        </div>

        <div id="msgs" className="msgs">
          {messages.map((m, idx) => {
            const isLast = idx === messages.length - 1;
            return (
              <div key={`${m.time}-${idx}`} className={`msg ${isLast ? 'new' : ''}`}>
                <div className={`av ${m.avatarCls}`}>{m.id}</div>
                <div className="b">
                  <b>{m.author}</b>
                  {m.badge ? <span className="t">{m.badge}</span> : null}
                  <br />
                  {renderMessageText(m.text)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rules">
          <span>The client talks to the Analyst only.</span>
          <span>Only you can approve.</span>
          <span>Every decision is saved.</span>
        </div>
      </div>
    </div>
  );
}
