# Signoff — Full-Stack Grant Application & Review Workflow
### Flip the Switch Hackathon · Track 01: Best Business Workflow ($2,000)

[![Switch AI](https://img.shields.io/badge/Switch%20AI-Agent%20Protocol-00D4B4?style=flat-square)](https://github.com/switch-ai)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.1%20App%20Router-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)
[![Vitest](https://img.shields.io/badge/Vitest-Passing%20(6%2F6)-729B1B?style=flat-square&logo=vitest)](https://vitest.dev)

A full-stack, human-in-the-loop grant writing and compliance verification platform powered by **Switch AI**, **Next.js 15 (App Router)**, **TypeScript**, and **Tailwind CSS v4**.

Signoff solves one of the biggest bottlenecks in high-stakes funding proposals: **AI agents draft and score proposals quickly, but often hallucinate citations or invent statistics.** Signoff pairs multi-agent chat collaboration inside Switch rooms (`#grant-room`) with a zero-hallucination deterministic audit engine and an enforced human sign-off gate.

---

## 🏆 Hackathon Alignment (Track 01: Best Business Workflow)

| Judging Criteria | Weight | How This Project Meets & Exceeds |
|:---|:---:|:---|
| **Use of Switch** | **30%** | **Central & Essential.** Switch orchestrates the multi-agent room (`#grant-room`) connecting the client (Maya), AI agents (`@Analyst`, `@Drafter`, `@Reviewer`), and the human Approver across Slack/Discord/Teams via the Switch Agent Protocol (SSE in, HTTP out). Configured via [`switch-grant-workflow.template.yaml`](./switch-grant-workflow.template.yaml). |
| **Technical Execution** | **25%** | **Fully Reproducible & Zero-Bloat.** Installs and runs in 2 minutes (`npm install && npm start`). 100% TypeScript type-safe, zero external UI component libraries, deterministic checker with automated unit tests (`npm test`), and persistent file-based JSON state (`./data/state.json`). |
| **Creativity & Impact** | **25%** | **Solves Real Enterprise Pain.** Billions in grant and RFP funding are lost annually due to non-compliant attachments or hallucinated figures. Signoff enforces that every claim cites proof (`[E#]`), every gap is flagged, and the human approver retains sole legal authority. |
| **Presentation** | **20%** | **Comprehensive Documentation & Video Script.** Includes architecture diagrams, complete API references, a runnable Switch protocol simulator (`npm run switch:demo`), and a 2.5-minute demo video script. |

---

## 📐 Architecture: How Switch Powers Signoff

```mermaid
flowchart TD
    subgraph Switch Ecosystem [" Switch AI Infrastructure "]
        Chat["Team Chat\n(Slack / Discord / Teams)"]
        Room["Switch Room: #grant-room\n(Shared Log & Protocol Engine)"]
        Template["Room Template\nswitch-grant-workflow.template.yaml"]
        Template --> Room
        Chat <--> Room
    end

    subgraph Agents [" Switch Agents & Personas "]
        Maya["Maya (Client)"]
        Analyst["@Analyst Agent\n(RFP Ingestion)"]
        Drafter["@Drafter Agent\n(Cited Writing)"]
        Reviewer["@Reviewer Agent\n(Rubric Scoring)"]
        Approver["You (Human Approver)\n(Final Authority)"]
    end

    subgraph App [" Signoff Next.js Verification Engine "]
        API["Route Handlers & SSE Stream\n(/api/agent/*, /api/stream)"]
        Checker["Deterministic Audit Engine\nlib/checker.ts (No LLM, 100% Rules)"]
        Gate["Server Approval Gate\nPOST /api/approve (Enforces 409)"]
        Store["Persistent Store\n./data/state.json"]
        UI["5 Real-Time Dashboard Pages\n(/, /checklist, /draft, /score, /sign-off)"]
    end

    Room <--> Agents
    Analyst -- "POST /api/agent/requirements" --> API
    Drafter -- "POST /api/agent/draft" --> API
    Reviewer -- "POST /api/agent/review" --> API
    API --> Checker
    Checker --> Gate
    Gate --> Store
    Store -.-> UI
    API -- "SSE Sync" -.-> UI
    Approver -- "Resolves Fixes & Signs Off" --> Gate
```

---

## ✨ Key Features

1. **Native Switch Room Template (`switch-grant-workflow.template.yaml`)**:
   - Defines the `#grant-room`, bridge settings (Slack/Discord/Teams), agent triggers, addressing rules, and hard approval gates.
2. **Deterministic Audit Engine (`lib/checker.ts`)**:
   - Zero LLM, zero network calls. Deterministically validates that every citation (`[E1]–[E8]`) exists in the evidence database.
   - Catches unknown citations (e.g. fake `[E99]`), unverified claims (missing sources), word count limits, and required file attachments.
   - Dynamically calculates the rubric score (78/100) across 4 categories: Need (30), Approach (30), Capacity (20), and Budget (20).
3. **Server-Enforced Human Gate (`/api/approve`)**:
   - The server decides, never the client.
   - If any required fix is open, `POST /api/approve` returns **HTTP 409 Conflict** with an explicit error message.
   - Only when all fixes are checked does the server permit approval and stamp the immutable decision log.
4. **Live Multi-Tab Synchronization (`/api/stream`)**:
   - Real-time Server-Sent Events (SSE) keep all open browser tabs and chat room listeners in sync instantly.
5. **Exact Pixel-Matched UI**:
   - Pure black theme, sharp square tiles (0px border-radius), 2px solid borders, hard offset shadows, teal-to-lime gradients (`#00D4B4` to `#B6FF4D`), and animated ASCII conveyor simulation.

---

## 🚀 Quickstart & Reproduction

### Prerequisites
- Node.js 18+ (tested on Node v20 & v24)
- npm 9+

### 1. Clone & Install

```bash
git clone https://github.com/varun-zero/switch-track-1.git
cd switch-track-1
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```
*(Default bearer token in `.env.example` is `switch-agent-secret-token`)*

### 3. Run Development Server

```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 4. Run Unit Tests (Vitest)

```bash
npm test
```
Runs 6 unit tests verifying citation integrity, fake `[E99]` detection, unverified claim docking, and 409 server-side approval rejection.

---

## 🤖 Running the Switch Agent Protocol Simulator

You can simulate the entire live multi-agent interaction in Switch `#grant-room` using the built-in runner:

```bash
npm run switch:demo
```

*(For instantaneous execution during automated testing, run `npm run switch:demo:fast`)*

### What the Runner Demonstrates:
1. **Kickoff**: Client Maya uploads grant guidelines to `#grant-room`.
2. **@Analyst Agent**: Posts 8 parsed checklist items to `POST /api/agent/requirements`.
3. **@Drafter Agent**: Submits narrative sections citing proof `[E1]–[E8]` and marking `[GAP]` to `POST /api/agent/draft`.
4. **@Checker Tool**: Runs deterministic compliance audit.
5. **@Reviewer Agent**: Evaluates 4-part rubric and posts scores to `POST /api/agent/review`.
6. **Hard Approval Gate Test**: Attempts premature sign-off; **server rejects with HTTP 409 Conflict**.
7. **Human Approver**: Resolves both open audit fixes via `POST /api/fixes`.
8. **Final Sign-off**: Human approves via `POST /api/approve`; approval timestamp and decision log are permanently recorded.

---

## 📡 API Endpoints Reference

### Human & UI Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/state` | Returns full application state, dynamic checklist, problems, and rubric scores. |
| `POST` | `/api/fixes` | Toggles fix checkbox (`{ id, done }`), reruns deterministic checker, and logs action. |
| `POST` | `/api/approve` | Validates approval rules on server. Returns `409 Conflict` if fixes open, or `200 OK`. |
| `GET` | `/api/stream` | Server-Sent Events (SSE) stream for real-time dashboard updates. |
| `POST` | `/api/reset` | Resets state back to initial seed data. |

### Switch Agent Protocol Endpoints (Bearer Authenticated)
Header: `Authorization: Bearer <SIGNOFF_AGENT_TOKEN>`

| Method | Endpoint | Agent | Payload Description |
|---|---|---|---|
| `POST` | `/api/agent/requirements` | `@Analyst` | Updates checklist requirements array with validation. |
| `POST` | `/api/agent/draft` | `@Drafter` | Updates proposal sections with citations `[E#]` and `[GAP]`. |
| `POST` | `/api/agent/review` | `@Reviewer` | Updates 4-category rubric scores and feedback. |

---

## 🎬 Demo Video Script (2 Minutes 30 Seconds)

If recording your hackathon presentation video, follow this recommended walkthrough:

* **0:00 – 0:30 (Problem & Track Introduction)**:
  - *"Welcome to Signoff, built for Track 01: Best Business Workflow in the Flip the Switch Hackathon."*
  - *"In grant applications and RFPs, AI drafting often hallucinates numbers or citations. Signoff brings humans and Switch agents together: agents draft and score, but our deterministic checker and human approver gate the final sign-off."*
* **0:30 – 1:10 (Switch Room `#grant-room` & Flowchart)**:
  - Show the main page (`/`). Explain the ASCII conveyor belt and Switch room `#grant-room`.
  - Walk through the 8-step pipeline: Maya (client) -> Analyst -> Drafter -> Checker -> Reviewer -> Human Approver.
* **1:10 – 1:45 (Checklist, Draft, and Score Pages)**:
  - Navigate to `/checklist`: Show how requirements map to proof documents (`E1`–`E8`).
  - Navigate to `/draft`: Point out how verified citations appear in green and missing sources have wavy red flags.
  - Navigate to `/score`: Show the computed 78/100 score and explain the rubric breakdown.
* **1:45 – 2:15 (The Server-Enforced Approval Gate)**:
  - Navigate to `/sign-off`.
  - Click "Approve and save final file" with unchecked boxes: show the toast alert popping up with HTTP 409 error: *"Fix both problems first."*
  - Check both boxes: *"I added a source..."* and *"I attached the board member list."*
  - Click "Approve": Show instant success toast and the new timestamped entry in the Decision Log.
* **2:15 – 2:30 (Switch Agent Runner & Closing)**:
  - Switch to the terminal and run `npm run switch:demo` to show the Switch Agent Protocol in action.
  - *"Everything runs locally, backed by Switch and Next.js. Thank you!"*

---

## 📄 License

MIT License. Built with ❤️ for the Flip the Switch Hackathon 2026.
