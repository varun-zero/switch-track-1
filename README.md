# Critical Revenue Incident & Rollback Sentinel

**Flip the Switch Hackathon — Track 01: Best Business Workflow ($2,000 Prize Track)**  
*Autonomous Multi-Agent Incident Triage, Deterministic Reproduction, and Human-Gated Canary Rollback powered by the Switch Agent Protocol.*

---

## 1. Executive Summary & Problem Statement

When a Tier-0 checkout API begins throwing `HTTP 500` errors during peak traffic, engineering teams lose **$10,000–$25,000 per minute** simply context-switching between Sentry alerts, Datadog dashboards, GitHub commit diffs, database pool metrics, and Slack/Mattermost war rooms.

**Sentinel** solves this by orchestrating three specialized coding/ops agents and human engineers inside a shared **Switch Room**:
1. **`@ops-triager` (Sentry/Triager Agent)**: Listens to webhook error spikes via Switch SSE, correlates the onset timestamp with production deploy tags, isolates commit `8f9d2a1` (`v2.14.0`), and posts a strict **2-line blast radius summary** ($14,200/min revenue exposure).
2. **`@ops-repro` (Diagnostic/Reproducer Agent)**: Triggered via `owner-agents` addressing, verifies PostgreSQL connection pool health (ruling out DB saturation), inspects the exact git diff in `src/services/checkout/stripeIntent.ts`, and executes an isolated sandbox reproduction script (`repro_checkout_500.ts`).
3. **`@ops-release` (Remediation/Release Agent)**: Prepares a canary rollback to `v2.13.2` alongside hotfix PR `#1842`, calculates a deterministic **Rollback Risk Score (`0.08 LOW` — zero schema migrations)**, and enforces a **hard human approval gate** before firing the production deployment rollback webhook.
4. **Human Operator (Chat / Wispr Flow Voice Dictation)**: Reviews the git diff and repro output in the chat room, then speaks or types:
   > `@ops-release Approved. Roll back to v2.13.2`

---

## 2. Switch Architecture & Agent Protocol Topology

```
+-----------------------------------------------------------------------------------+
|                   TEAM CHAT (Mattermost / Slack / Discord / Teams)                |
|  Human Operator: "@ops-release Approved. Roll back to v2.13.2" (or Wispr Flow)    |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                           SWITCH CORE / ROOM STATE ENGINE                         |
|  Shared Room State: Messages · Rules · Tasks · Decisions · Audit Ledger           |
|  Addressing Rules:  @ops-triager (anyone) | @ops-repro (owner-agents)             |
|                     @ops-release (human-gated release controller)                 |
+-------------------+-------------------------------------------+-------------------+
                    | SSE Stream In                             | HTTP Callback Out
                    | GET /api/switch/stream                    | POST /api/switch/messages
                    v                                           |
+---------------------------------------------------------------+-------------------+
|                     SENTINEL MULTI-AGENT WORKER (Node.js / Express)               |
|  1. ops-triager  -> Parses Sentry 500s, isolates SHA 8f9d2a1, 2-line blast radius |
|  2. ops-repro    -> Verifies PG pool (42/200 active), diffs commit, runs repro    |
|  3. ops-release  -> Stages rollback PR, computes risk (0.08), awaits sign-off     |
+-----------------------------------------------------------------------------------+
```

---

## 3. Quickstart & Reproduction Steps

### Option A: One-Command Docker Stack (Switch Core + Local Mattermost + Worker)
```bash
# 1. Clone the repository and start the complete mesh
docker compose up --build

# 2. Import the Switch Room Template via Switch CLI / Console
switch room apply -f sentinel.template.yaml

# 3. Open the Tactical Incident HUD & Mattermost Simulator
open http://localhost:3000
```

### Option B: Local Interactive Evaluation (Node.js / Express + Live SSE HUD)
```bash
# 1. Install dependencies and run unit tests
npm install
npm test

# 2. Launch the full-stack Switch Agent Protocol Server + Incident HUD on port 3000
npm run dev
```

### Reproducing the End-to-End Incident Flow
1. **Trigger Simulated Sentry 500 Spike**:
   - In the Tactical HUD header (or via cURL), click **"Trigger Incident (Checkout 500s)"** or run:
     ```bash
     curl -X POST http://localhost:3000/api/webhooks/sentry-incident \
       -H "Content-Type: application/json" \
       -d '{"scenarioId": "checkout-stripe-null-ref"}'
     ```
2. **Observe Autonomous Switch Room Handoff**:
   - `@ops-triager` receives `EVENT:SENTRY_ERROR_SPIKE` over SSE, isolates `v2.14.0` (`8f9d2a1`), and outputs a 2-line blast radius summary.
   - `@ops-repro` automatically picks up the handoff, verifies PostgreSQL health (`42/200 connections, 1.8ms p95`), extracts the git diff, runs `repro_checkout_500.ts`, and confirms the `TypeError` reproduction.
   - `@ops-release` stages rollback plan `RB-2026-089` to `v2.13.2`, calculates risk `0.08 (LOW)`, updates task `TASK-104` to `AWAITING_HUMAN_SIGNOFF`, and halts.
3. **Human Sign-Off in Chat**:
   - In the Switch Room / Mattermost Chat console, type or dictate via Wispr Flow:
     ```text
     @ops-release Approved. Roll back to v2.13.2
     ```
   - `@ops-release` validates the cryptographic/audit approval, invokes the deployment rollback webhook, shifts canary traffic `100% -> v2.13.2`, and resolves the incident.

---

## 4. Wispr Flow Voice Dictation Side-Track Compatibility

Sentinel's addressing parser and `sentinel.template.yaml` prompt grammar are specifically engineered for **zero-friction voice dictation via Wispr Flow**:
- **Natural Speech Normalization**: When an on-call engineer holds their Wispr Flow hotkey and speaks *"ops release approved roll back to version 2 point 13 point 2"* or *"ops release approved roll back to v2.13.2"*, the Switch message normalizer maps spoken tokens (`"ops release"` -> `@ops-release`, `"version 2 point 13 point 2"` -> `v2.13.2`) without requiring manual `@` symbols or strict punctuation.
- **Concise Dictation Presets Built Into HUD**: The Incident HUD includes a live **Wispr Flow Voice Bar** with instant voice-transcript injection so judges can test spoken commands directly in the browser.

---

## 5. Two-Minute Demo Video Script (Submission Kit)

| Timestamp | Visual On Screen | Spoken Narration (Voiceover) |
| :--- | :--- | :--- |
| **0:00 – 0:20** | **Split screen**: Mattermost Incident Channel on left, Sentinel Tactical HUD on right (`NOMINAL` state, `0.02%` error rate). | *"Every minute of checkout downtime costs enterprise teams over fourteen thousand dollars. Today we're showing Sentinel—an autonomous incident response workflow built on Switch that connects Sentry, Git, and deployment pipelines directly into our team chat room."* |
| **0:20 – 0:45** | Click **"Trigger Incident (Checkout 500s)"**. Crimson alert indicator lights up (`18.4%` error rate, `$14,200/min` burn). `@ops-triager` posts 2-line blast radius in room. | *"A production deployment v2.14.0 just caused a spike in HTTP 500s on `/api/v2/checkout/confirm`. Instantly, Switch routes the event over SSE to `@ops-triager`. Within two seconds, it isolates commit `8f9d2a1` and posts a strict two-line blast radius summary."* |
| **0:45 – 1:15** | `@ops-repro` responds in the room via `owner-agents` trigger. Center HUD pane displays the exact Git diff and live sandbox output of `repro_checkout_500.ts`. | *"Without human prompting, `@ops-triager` hands off to `@ops-repro`. `@ops-repro` checks our Postgres connection pool to rule out database saturation, pulls the offending git diff, and runs an isolated reproduction script confirming an unguarded null dereference on Apple Pay Express checkouts."* |
| **1:15 – 1:40** | `@ops-release` posts the canary rollback plan (`v2.13.2`, Risk `0.08 LOW`) and enters `AWAITING_HUMAN_SIGNOFF` (Amber status). | *"Next, `@ops-release` prepares a canary rollback to `v2.13.2` and verifies zero destructive database migrations. Because production rollbacks carry business risk, Switch's room rules enforce a hard human-in-the-loop gate."* |
| **1:40 – 2:00** | Engineer holds Wispr Flow dictation button and speaks: `"@ops-release Approved. Roll back to v2.13.2"`. Rollback webhook fires; error rate drops to `0.01%`; status turns Emerald `RESOLVED`. | *"Using Wispr Flow voice dictation, I simply say: 'ops release approved, roll back to v2.13.2'. Switch records my approval in the immutable room audit log, `@ops-release` triggers the rollback webhook, and checkout recovery is verified in under 45 seconds."* |
