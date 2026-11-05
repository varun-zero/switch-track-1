'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import SceneAnimation from '@/components/SceneAnimation';

const STEPS = [
  {
    title: 'You add the document',
    actor: 'You',
    desc: 'Drop the grant rules and your proof files into a chat room.',
  },
  {
    title: 'Switch sets up two rooms',
    actor: 'Switch',
    desc: 'One private room for the client. One for the team.',
  },
  {
    title: 'Analyst agent makes a checklist',
    actor: 'AI agent',
    desc: 'It reads the rules and lists everything the application needs.',
  },
  {
    title: 'You make the key call',
    actor: 'You',
    desc: 'If something is missing, a person decides. Agents can’t.',
  },
  {
    title: 'Drafter agent writes',
    actor: 'AI agent',
    desc: 'It writes each section and shows where every fact came from.',
  },
  {
    title: 'Automatic checker runs',
    actor: 'Plain program',
    desc: 'A normal program, not AI, checks sources, word limits and files.',
  },
  {
    title: 'Reviewer agent scores',
    actor: 'AI agent',
    desc: 'It gives a score out of 100 and lists problems. It can’t approve.',
  },
  {
    title: 'You sign off',
    actor: 'You',
    desc: 'You approve. The final file is saved and the room keeps the record.',
  },
];

export default function HowItWorksPage() {
  const [activeStepIndices, setActiveStepIndices] = useState<number[]>([]);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const play = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setActiveStepIndices([]);

    const isReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    STEPS.forEach((_, i) => {
      const delay = isReducedMotion ? 0 : 300 + i * 800;
      const timer = setTimeout(() => {
        setActiveStepIndices((prev) => [...prev, i]);
      }, delay);
      timersRef.current.push(timer);
    });
  }, []);

  useEffect(() => {
    play();
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [play]);

  return (
    <>
      <div className="hero">
        <h1>Three AI helpers do the paperwork. You make the call.</h1>
        <div className="facts">
          <div className="fact">
            <b>3</b>
            <span>AI helpers, each with one job</span>
          </div>
          <div className="fact">
            <b>1</b>
            <span>automatic checker for sources and limits</span>
          </div>
          <div className="fact">
            <b>1</b>
            <span>person who approves</span>
          </div>
        </div>
      </div>

      <p className="what">
        What is this? Signoff helps a small team finish a grant application. Follow the steps below to see who does what.
      </p>

      <div className="bridge">
        <h2>Now, step by step</h2>
        <p>
          The animation showed 5 stops. Here is the full story in 8 steps, including the setup and who does each part. Steps tagged “You” need a person. Agents can’t do them.
        </p>
        <div className="legend">
          <span>
            <span className="tag you">You</span>a person decides
          </span>
          <span>
            <span className="tag">AI agent</span>AI does the work
          </span>
          <span>
            <span className="tag">Plain program</span>normal code, no AI
          </span>
          <span>
            <span className="tag">Switch</span>the chat rooms
          </span>
        </div>
      </div>

      <div className="flow">
        {STEPS.map((s, i) => {
          const isOn = activeStepIndices.includes(i);
          const isYou = s.actor === 'You';
          return (
            <div key={i} className={`step ${isOn ? 'on' : ''}`}>
              <div className="num">{i + 1}</div>
              <span className={`tag ${isYou ? 'you' : ''}`}>{s.actor}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          );
        })}
      </div>

      <SceneAnimation />

      <div className="why">
        <h2>Why use Switch?</h2>
        <ul>
          <li>Each agent has its own job and its own permissions.</li>
          <li>The room keeps a record of who decided what.</li>
          <li>Without Switch, anyone could skip a step.</li>
        </ul>
      </div>
    </>
  );
}
