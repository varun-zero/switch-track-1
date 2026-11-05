import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import {
  INCIDENT_SCENARIOS,
  SwitchRoomState,
  createInitialRoomState,
  formatSwitchSseFrame,
  processHumanRoomMessage,
} from './src/logic/sentinelEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Shared Switch Room State in memory
  let roomState: SwitchRoomState = createInitialRoomState('checkout-stripe-null-ref', true);

  // Connected SSE clients (Switch Agent Protocol listeners & HUD stream consumers)
  const sseClients = new Set<express.Response>();

  function broadcastSseEvent(eventType: string, payload: unknown) {
    const eventId = `sse_${Date.now()}`;
    const wireFrame = formatSwitchSseFrame(eventType, payload, eventId);
    for (const client of sseClients) {
      client.write(wireFrame);
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Switch Agent Protocol: Server-Sent Events (SSE) Stream
  //    GET /api/switch/stream
  // ---------------------------------------------------------------------------
  app.get('/api/switch/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const agentFilter = typeof req.query.agent === 'string' ? req.query.agent : 'all';
    res.write(
      formatSwitchSseFrame(
        'switch.handshake',
        {
          protocol: 'switch-agent-protocol/1.0',
          roomId: roomState.roomId,
          roomName: roomState.roomName,
          subscribedAgent: agentFilter,
          incidentStatus: roomState.incidentStatus,
          timestamp: new Date().toISOString(),
        },
        `sse_init_${Date.now()}`
      )
    );

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Get Current Switch Room State + Scenarios
  //    GET /api/switch/state
  // ---------------------------------------------------------------------------
  app.get('/api/switch/state', (_req, res) => {
    const activeScenario =
      INCIDENT_SCENARIOS[roomState.activeScenarioId] ?? INCIDENT_SCENARIOS['checkout-stripe-null-ref'];
    res.json({
      roomState,
      activeScenario,
      scenarios: Object.values(INCIDENT_SCENARIOS).map((s) => ({
        id: s.id,
        name: s.name,
        endpoint: s.endpoint,
        offendingVersion: s.offendingVersion,
        rollbackTargetVersion: s.rollbackTargetVersion,
        errorRatePeakPct: s.errorRatePeakPct,
        revenueLossPerMinUsd: s.revenueLossPerMinUsd,
      })),
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Switch Agent Protocol: Post Message / Command to Room (HTTP Out / Chat)
  //    POST /api/switch/messages
  // ---------------------------------------------------------------------------
  app.post('/api/switch/messages', (req, res) => {
    const { message, operatorHandle, chatAdapter } = req.body as {
      message?: string;
      operatorHandle?: string;
      chatAdapter?: 'Mattermost' | 'Slack' | 'Discord' | 'Teams';
    };

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Message content is required.' });
      return;
    }

    if (chatAdapter) {
      roomState = { ...roomState, chatAdapter };
    }

    const result = processHumanRoomMessage(
      roomState,
      message,
      operatorHandle || 'varun.sre (On-Call Lead)'
    );
    roomState = result.nextState;

    // Broadcast each new message and updated state over Switch SSE
    for (const msg of result.newMessages) {
      broadcastSseEvent('room.message', msg);
    }
    broadcastSseEvent('room.state_updated', {
      roomState,
      activeScenario: INCIDENT_SCENARIOS[roomState.activeScenarioId],
    });

    res.json({
      ok: true,
      parsedCommand: result.parsedCommand,
      roomState,
      activeScenario: INCIDENT_SCENARIOS[roomState.activeScenarioId],
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Simulated Sentry / Datadog Error Spike Webhook
  //    POST /api/webhooks/sentry-incident
  // ---------------------------------------------------------------------------
  app.post('/api/webhooks/sentry-incident', (req, res) => {
    const { scenarioId, mode } = req.body as {
      scenarioId?: string;
      mode?: 'triaged' | 'nominal';
    };

    const targetScenarioId =
      scenarioId && INCIDENT_SCENARIOS[scenarioId]
        ? scenarioId
        : roomState.activeScenarioId || 'checkout-stripe-null-ref';

    const startInTriaged = mode !== 'nominal';
    roomState = createInitialRoomState(targetScenarioId, startInTriaged);

    broadcastSseEvent('webhook.sentry_error_spike', {
      scenarioId: targetScenarioId,
      incidentStatus: roomState.incidentStatus,
      timestamp: new Date().toISOString(),
    });
    broadcastSseEvent('room.state_updated', {
      roomState,
      activeScenario: INCIDENT_SCENARIOS[targetScenarioId],
    });

    res.json({
      ok: true,
      roomState,
      activeScenario: INCIDENT_SCENARIOS[targetScenarioId],
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Simulated Production Deployment Rollback Webhook
  //    POST /api/webhooks/deploy-rollback
  // ---------------------------------------------------------------------------
  app.post('/api/webhooks/deploy-rollback', (req, res) => {
    const { targetVersion, operatorHandle } = req.body as {
      targetVersion?: string;
      operatorHandle?: string;
    };
    const ver = targetVersion || roomState.targetRollbackVersion || 'v2.13.2';
    const command = `@ops-release Approved. Roll back to ${ver}`;
    const result = processHumanRoomMessage(
      roomState,
      command,
      operatorHandle || 'varun.sre (On-Call Lead)'
    );
    roomState = result.nextState;

    for (const msg of result.newMessages) {
      broadcastSseEvent('room.message', msg);
    }
    broadcastSseEvent('room.state_updated', {
      roomState,
      activeScenario: INCIDENT_SCENARIOS[roomState.activeScenarioId],
    });

    res.json({
      ok: true,
      roomState,
      activeScenario: INCIDENT_SCENARIOS[roomState.activeScenarioId],
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Serve Real Repository Deliverables for Inspection & Download
  //    GET /api/deliverables
  // ---------------------------------------------------------------------------
  app.get('/api/deliverables', (_req, res) => {
    const readSafe = (relPath: string) => {
      try {
        return fs.readFileSync(path.join(__dirname, relPath), 'utf-8');
      } catch {
        return `# Error reading ${relPath}`;
      }
    };

    res.json({
      templateYaml: readSafe('sentinel.template.yaml'),
      dockerCompose: readSafe('docker-compose.yml'),
      readmeMd: readSafe('README.md'),
      agentServerCode: readSafe('server.ts'),
      engineLogicCode: readSafe('src/logic/sentinelEngine.ts'),
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Vite Dev Middleware / Static Production Serving
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Sentinel Switch Worker] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
