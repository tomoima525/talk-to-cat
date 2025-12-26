/**
 * XAI Voice WebRTC Server
 *
 * WebRTC-to-WebSocket relay server for XAI's realtime voice API.
 * Handles signaling, peer connections, and audio/message relay.
 */

import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import type { WSContext } from "hono/ws";
import { SessionManager } from "./session-manager";
import { RTCPeerManager } from "./rtc-peer";
import type { SignalingMessage } from "./types";

// Helper to get timestamp with milliseconds
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString().split("T")[1].replace("Z", "");
};

// Override console.log to include timestamps
const originalLog = console.log;
console.log = (...args: unknown[]) => {
  originalLog(`[${getTimestamp()}]`, ...args);
};

const app = new Hono();

// Create WebSocket handler
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// CORS Configuration - Configure for your specific domain in production
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:5173,http://localhost:8080"
).split(",");

// Enable CORS for web clients
app.use(
  "*",
  cors({
    origin: ALLOWED_ORIGINS,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Configuration
const XAI_API_KEY = process.env.XAI_API_KEY || "";
const API_URL = process.env.API_URL || "wss://api.x.ai/v1/realtime";
const PORT = Number(process.env.PORT) || 8000;
const INSTRUCTIONS =
  process.env.INSTRUCTIONS ||
  `You are a lazy cat. Lazy cat randomly say you don't want to answer user's question. You Meow, purr, hiss, mrow, caterwaul during the conversation. You use playful phrases with cat-related words, such as "You've cat to be kitten me," "cat's pajamas". You are speaking to a user in real-time over audio. Keep your responses conversational and concise since they will be spoken aloud.`;
const VOICE = process.env.VOICE || "sal";

// Initialize session manager
const sessionManager = new SessionManager();

// Store active peer connections
const peerConnections = new Map<string, RTCPeerManager>();

// ========================================
// REST API Endpoints
// ========================================

app.get("/", (c) => {
  return c.json({
    service: "XAI Voice WebRTC Server",
    provider: "XAI",
    protocol: "WebRTC",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/health",
      sessions: "/sessions",
      signaling: "/signaling/{session_id}",
    },
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    provider: "XAI",
    protocol: "WebRTC",
    timestamp: new Date().toISOString(),
    sessions_active: sessionManager.getSessionCount(),
    peer_connections_active: peerConnections.size,
  });
});

/**
 * Get ephemeral token for direct XAI API connection
 * POST /session
 */
app.post("/session", async (c) => {
  try {
    console.log("📝 Creating ephemeral session...");

    const SESSION_REQUEST_URL = "https://api.x.ai/v1/realtime/client_secrets";
    const response = await fetch(SESSION_REQUEST_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: { seconds: 300 },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to get ephemeral token: ${response.status} ${errorText}`);
      return c.json(
        {
          error: "Failed to create session",
          details: errorText,
        },
        response.status as 400 | 401 | 403 | 404 | 500
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    console.log("✅ Ephemeral session created");

    // Return token along with configuration for frontend
    return c.json({
      ...data,
      voice: VOICE,
      instructions: INSTRUCTIONS,
    });
  } catch (error) {
    console.error("❌ Error creating session:", error);
    return c.json(
      {
        error: "Failed to create session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

app.post("/sessions", async (c) => {
  // Get sample rate from request body
  const body = await c.req.json().catch(() => ({}));
  const requestedSampleRate = body.sample_rate || 24000;

  // Validate and find closest supported sample rate
  const SUPPORTED_SAMPLE_RATES = [8000, 16000, 21050, 24000, 32000, 44100, 48000];
  let sampleRate = 24000; // default
  if (SUPPORTED_SAMPLE_RATES.includes(requestedSampleRate)) {
    sampleRate = requestedSampleRate;
  } else {
    // Find closest supported sample rate
    sampleRate = SUPPORTED_SAMPLE_RATES.reduce((prev, curr) =>
      Math.abs(curr - requestedSampleRate) < Math.abs(prev - requestedSampleRate) ? curr : prev
    );
    console.log(`Sample rate ${requestedSampleRate}Hz not supported, using ${sampleRate}Hz`);
  }

  const session = sessionManager.createSession(sampleRate);
  return c.json({
    session_id: session.id,
    signaling_url: `/signaling/${session.id}`,
    created_at: session.created_at,
    sample_rate: session.sample_rate,
  });
});

app.get("/sessions", (c) => {
  const sessions = sessionManager.getAllSessions();
  return c.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      created_at: s.created_at,
      status: s.status,
      webrtc_stats: s.webrtcStats,
    })),
    count: sessions.length,
  });
});

app.delete("/sessions/:sessionId", (c) => {
  const sessionId = c.req.param("sessionId");
  const session = sessionManager.getSession(sessionId);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Clean up peer connection
  const peer = peerConnections.get(sessionId);
  if (peer) {
    peer.close();
    peerConnections.delete(sessionId);
  }

  sessionManager.deleteSession(sessionId);

  return c.json({
    message: "Session deleted",
    session_id: sessionId,
  });
});

app.get("/sessions/:sessionId/stats", async (c) => {
  const sessionId = c.req.param("sessionId");
  const session = sessionManager.getSession(sessionId);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  const peer = peerConnections.get(sessionId);
  if (!peer) {
    return c.json({ error: "Peer connection not found" }, 404);
  }

  const stats = await peer.getStats();
  sessionManager.updateSessionStats(sessionId, stats);

  return c.json({
    session_id: sessionId,
    stats,
  });
});

// ========================================
// WebSocket Signaling Endpoint
// ========================================

app.get(
  "/signaling/:sessionId",
  upgradeWebSocket((c) => {
    const sessionId = c.req.param("sessionId");
    let peerManager: RTCPeerManager | null = null;
    let statsInterval: ReturnType<typeof setInterval> | null = null;

    return {
      onOpen: async (_event: Event, ws: WSContext) => {
        console.log(`[${sessionId}] 🔌 Client connected for signaling`);

        // Verify session exists (must be created via POST /sessions first)
        const session = sessionManager.getSession(sessionId);
        if (!session) {
          ws.close(1002, "Session not found. Create session first via POST /sessions");
          console.log(`[${sessionId}] ❌ Session not found - signaling connection rejected`);
          return;
        }

        console.log(`[${sessionId}] 🎵 Using session with sample rate: ${session.sample_rate}Hz`);
        sessionManager.updateSessionStatus(sessionId, "active");

        // Create RTCPeerManager with session's sample rate
        peerManager = new RTCPeerManager({
          sessionId,
          xaiApiKey: XAI_API_KEY,
          xaiApiUrl: API_URL,
          voice: VOICE,
          instructions: INSTRUCTIONS,
          sampleRate: session.sample_rate,
        });

        peerConnections.set(sessionId, peerManager);

        // Initialize XAI connection in parallel (don't block offer creation)
        const xaiInitPromise = peerManager
          .initializeXAI()
          .then(() => {
            console.log(`[${sessionId}] ✅ XAI API initialized`);
          })
          .catch((error) => {
            console.error(`[${sessionId}] ❌ Failed to initialize XAI API:`, error);
            ws.close(1011, "Failed to connect to XAI API");
          });

        // Create and send offer
        try {
          const offer = await peerManager.createOffer();
          const message: SignalingMessage = {
            type: "offer",
            sdp: offer.sdp!,
          };
          ws.send(JSON.stringify(message));
          console.log(`[${sessionId}] 📤 Offer sent to client`);
        } catch (error) {
          console.error(`[${sessionId}] ❌ Failed to create offer:`, error);
          ws.close(1011, "Failed to create offer");
          return;
        }

        // Ensure XAI is ready
        try {
          await xaiInitPromise;
        } catch {
          // Error already logged and handled above
          return;
        }

        // Start periodic stats collection
        statsInterval = setInterval(async () => {
          try {
            if (peerManager) {
              const stats = await peerManager.getStats();
              sessionManager.updateSessionStats(sessionId, stats);
            }
          } catch {
            // Ignore stats errors
          }
        }, 5000);
      },

      onMessage: async (event: MessageEvent, ws: WSContext) => {
        if (!peerManager) return;

        try {
          const message: SignalingMessage = JSON.parse(event.data.toString());

          switch (message.type) {
            case "answer": {
              console.log(`[${sessionId}] 📥 Answer received from client`);
              await peerManager.handleAnswer({
                type: "answer",
                sdp: message.sdp,
              });

              // Send ready message
              const readyMessage: SignalingMessage = { type: "ready" };
              ws.send(JSON.stringify(readyMessage));
              console.log(`[${sessionId}] ✅ WebRTC connection established`);
              break;
            }

            case "ice-candidate":
              if (message.candidate) {
                await peerManager.handleIceCandidate(message.candidate);
              }
              break;

            default:
              console.log(`[${sessionId}] ⚠️  Unknown signaling message type: ${message.type}`);
          }
        } catch (error) {
          console.error(`[${sessionId}] ❌ Error processing signaling message:`, error);
        }
      },

      onClose: () => {
        console.log(`[${sessionId}] Client disconnected`);

        // Clean up stats interval
        if (statsInterval) {
          clearInterval(statsInterval);
          statsInterval = null;
        }

        // Clean up peer connection
        if (peerManager) {
          peerManager.close();
          peerConnections.delete(sessionId);
          peerManager = null;
        }

        // Update session status
        sessionManager.updateSessionStatus(sessionId, "closed");

        console.log(`[${sessionId}] Session cleaned up`);
      },

      onError: (event: Event) => {
        console.error(`[${sessionId}] ❌ Signaling WebSocket error:`, event);
      },
    };
  })
);

// ========================================
// Start Server
// ========================================

const server = serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  () => {
    console.log("=".repeat(60));
    console.log("🚀 XAI Voice WebRTC Server Starting");
    console.log("=".repeat(60));
    console.log(`📡 API URL: ${API_URL}`);
    console.log(`🔑 API Key: ${XAI_API_KEY ? "Configured" : "❌ Missing"}`);
    console.log(`🌐 Port: ${PORT}`);
    console.log(`🎙️  Voice: ${VOICE}`);
    console.log(`📝 Instructions: ${INSTRUCTIONS.substring(0, 50)}...`);
    console.log(`🔒 CORS Origins: ${ALLOWED_ORIGINS.join(", ")}`);
    console.log("=".repeat(60));
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Session endpoint: POST http://localhost:${PORT}/session`);
    console.log("=".repeat(60));

    if (!XAI_API_KEY) {
      console.log("⚠️  WARNING: XAI_API_KEY not configured!");
      console.log("⚠️  Create a .env file with your XAI_API_KEY");
    }
  }
);

// Inject WebSocket handler into the server
injectWebSocket(server);
