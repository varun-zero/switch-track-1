# Signoff — Full-Stack Grant Application Decision App

A full-stack implementation of the Signoff workflow platform, built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS v4**.

Signoff is a human-in-the-loop verification platform where specialized AI agents assist in drafting and scoring grant applications, but only the designated human Approver can make key decisions and grant final approval.

---

## Features

- **Pixel-Matched UI**: Square geometry, hard offset shadows, exact teal-to-lime gradients (`#00D4B4` to `#B6FF4D`), and identical copy and typography (Sora and Inter via `next/font/google`).
- **5 Full-Stack Pages**:
  - `/` — **How it works**: Visual flowchart, real-time stat tiles, animated ASCII conveyor belt, and explanation.
  - `/checklist` — **Requirements checklist**: Dynamic status pills (`Done`, `Needs a fix`, `Missing`) calculated by the deterministic checker.
  - `/draft` — **The draft**: Dynamic citation tags (`[E#]`), gap markers (`GAP`), and wavy red underlines for unverified claims.
  - `/score` — **Review score**: Calculated score (78/100) across 4 rubric categories (Need, Approach, Capacity, Budget) with progress bars and dynamic problems list.
  - `/sign-off` — **Sign off**: Real backend-enforced approval logic with two live fix checkboxes and persistent decision log.
- **Deterministic Checker (`lib/checker.ts`)**:
  - Verifies that all citations exist in the evidence index (e.g. catches fake `[E99]` citations).
  - Flags claims with missing sources or gaps.
  - Verifies word counts and required attachments.
  - Computes weighted rubric scores dynamically.
- **Server Enforcement**:
  - The server decides whether approval is allowed via `POST /api/approve` (returns HTTP `409 Conflict` if any fix is open).
  - State persisted to `./data/state.json`.
- **Live Tab Synchronization**:
  - Server-Sent Events (`/api/stream`) ensures multiple open browser tabs remain in real-time sync.
- **Switch Agent API Endpoints**:
  - Dedicated endpoints for Switch agents (`Analyst`, `Drafter`, `Reviewer`), protected by bearer tokens with schema validation.

---

## Installation & Setup

### Prerequisites

- Node.js 18+ (tested on Node v24)
- npm 9+

### 1. Clone & Install Dependencies

```bash
git clone <repo-url>
cd switch-track-1
npm install
```

### 2. Configure Environment Variables

Create `.env.local` based on `.env.example`:

```bash
cp .env.example .env.local
```

Example `.env.local`:
```env
# Switch agent authorization bearer token
SIGNOFF_AGENT_TOKEN=switch-agent-secret-token
```

### 3. Build & Run

**Development Mode:**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

**Production Build:**
```bash
npm run build
npm start
```

**Run Unit Tests:**
```bash
npm test
```

**Run Typecheck & Lint:**
```bash
npm run lint
```

---

## API Endpoints Reference

### User & UI Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/state` | Returns the entire application state, computed checklist, and problems. |
| `POST` | `/api/fixes` | Toggles a fix (`{ id, done }`), re-runs the checker, and logs to decision log. |
| `POST` | `/api/approve` | Validates approval rules on server. Returns `409` if fixes are open, or `200` if approved. |
| `GET` | `/api/stream` | Server-Sent Events (SSE) stream for real-time multi-tab state synchronization. |
| `POST` | `/api/reset` | Resets the demo state back to the original fictional seed data. |

---

## Switch Agent Integration

Switch agents authenticate using a Bearer token matching `SIGNOFF_AGENT_TOKEN` in `.env.local`:

```http
Authorization: Bearer switch-agent-secret-token
```

### 1. Analyst Agent: Post Requirements Checklist

The Analyst agent reads the funder's rules and posts the extracted requirements:

```bash
curl -X POST http://localhost:3000/api/agent/requirements \
  -H "Authorization: Bearer switch-agent-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "Analyst agent",
    "requirements": [
      {
        "id": "req-1",
        "text": "Nonprofit status letter",
        "required": true,
        "proof": "E1 Status letter",
        "status": "ok",
        "statusText": "Done"
      },
      {
        "id": "req-2",
        "text": "Serves the funder’s region",
        "required": true,
        "proof": "E2 Annual report",
        "status": "ok",
        "statusText": "Done"
      }
    ]
  }'
```

### 2. Drafter Agent: Post Draft Sections

The Drafter agent posts updated sections with citations (`[E#]`) and gap markers (`GAP: ...`):

```bash
curl -X POST http://localhost:3000/api/agent/draft \
  -H "Authorization: Bearer switch-agent-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "Drafter agent",
    "draft": [
      {
        "id": "draft-1",
        "title": "Why we need this",
        "maxWords": 500,
        "content": "Last year, 1,200 job seekers came to us for help [E4]. Most live in the three counties this fund serves [E2]. Our graduates earned 30% more within a year [E4]."
      }
    ]
  }'
```

### 3. Reviewer Agent: Post Rubric Scores

The Reviewer agent scores the draft against the funder's rubric:

```bash
curl -X POST http://localhost:3000/api/agent/review \
  -H "Authorization: Bearer switch-agent-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "Reviewer agent",
    "rubricScores": [
      { "name": "Need", "score": 28, "max": 30 },
      { "name": "Approach", "score": 26, "max": 30 },
      { "name": "Capacity", "score": 18, "max": 20 },
      { "name": "Budget", "score": 18, "max": 20 }
    ]
  }'
```
