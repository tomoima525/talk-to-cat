/**
 * WebRTC Peer Connection Manager
 * Handles WebRTC peer connection, DataChannel, and XAI API integration
 */

import { RTCPeerConnection } from "werift";
import type { WebRTCStats } from "./types";
import { XAIClient } from "./xai-client";

// Enable TURN servers for restrictive networks (adds 10-15s delay if TURN server is slow/unreachable)
// Set to false for development/most networks (STUN is sufficient)
const ENABLE_TURN = false;

export interface RTCPeerConfig {
  sessionId: string;
  xaiApiKey: string;
  xaiApiUrl: string;
  voice: string;
  instructions: string;
  sampleRate: number;
}

export class RTCPeerManager {
  private pc: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private xaiClient: XAIClient;
  private config: RTCPeerConfig;
  private stats: WebRTCStats = {
    bitrate: { audio_in: 0, audio_out: 0 },
    jitter: 0,
    packetLoss: 0,
    connectionState: "new",
    iceConnectionState: "new",
    lastUpdated: new Date().toISOString(),
  };

  constructor(config: RTCPeerConfig) {
    this.config = config;

    // Initialize XAI client
    this.xaiClient = new XAIClient({
      apiKey: config.xaiApiKey,
      apiUrl: config.xaiApiUrl,
      voice: config.voice,
      instructions: config.instructions,
      sessionId: config.sessionId,
      sampleRate: config.sampleRate,
    });

    // Initialize WebRTC peer connection
    const iceServers: RTCIceServer[] = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }, // Backup STUN server
    ];

    // Add TURN servers if enabled (only needed for restrictive corporate firewalls)
    if (ENABLE_TURN) {
      iceServers.push({
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
      });
      console.log(`[${config.sessionId}] ⚠️  TURN servers enabled (may cause slow connection)`);
    }

    console.log(`[${config.sessionId}] 🔧 Configuring ICE servers:`);
    iceServers.forEach((server, index) => {
      const serverInfo = typeof server.urls === "string" ? server.urls : (server.urls as string[]).join(", ");
      const hasAuth = "username" in server ? ` (auth: ${(server as RTCIceServer).username})` : "";
      console.log(`[${config.sessionId}]   ${index + 1}. ${serverInfo}${hasAuth}`);
    });

    this.pc = new RTCPeerConnection({
      // @eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error werift doesn't have the same iceServers type as wrtc
      iceServers,
    });

    this.setupPeerConnection();
    this.setupDataChannel();
  }

  /**
   * Set up peer connection event handlers
   */
  private setupPeerConnection(): void {
    const { sessionId } = this.config;

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        const timestamp = new Date().toISOString().split("T")[1].replace("Z", "");
        const candidate = event.candidate as RTCIceCandidate;
        const candidateStr = candidate.candidate || JSON.stringify(candidate);

        // Parse candidate type and server info
        let candidateType = candidate.type || "unknown";
        let address = candidate.address || "unknown";
        let port = candidate.port || "?";
        let protocol = candidate.protocol || "?";

        // Try to extract from candidate string if properties not available
        if (candidateStr && typeof candidateStr === "string") {
          const typeMatch = candidateStr.match(/typ (\w+)/);
          const addressMatch = candidateStr.match(/(\d+\.\d+\.\d+\.\d+)/);
          const portMatch = candidateStr.match(/\s(\d+)\s+typ/);
          const protocolMatch = candidateStr.match(/UDP|TCP|udp|tcp/i);

          if (typeMatch) candidateType = typeMatch[1];
          if (addressMatch) address = addressMatch[1];
          if (portMatch) port = portMatch[1];
          if (protocolMatch) protocol = protocolMatch[0].toLowerCase();
        }

        console.log(
          `[${timestamp}] [${sessionId}] 🧊 ICE candidate: type=${candidateType} proto=${protocol} addr=${address}:${port}`
        );

        // Log detailed candidate string for debugging
        if (candidateStr && typeof candidateStr === "string" && candidateStr.length < 200) {
          console.log(`[${timestamp}] [${sessionId}]    └─ ${candidateStr}`);
        }
      } else {
        const timestamp = new Date().toISOString().split("T")[1].replace("Z", "");
        console.log(`[${timestamp}] [${sessionId}] 🧊 ICE candidate gathering complete (null candidate)`);
      }
    };

    this.pc.onconnectionstatechange = () => {
      this.stats.connectionState = this.pc.connectionState;
      console.log(`[${sessionId}] 🔌 Connection state: ${this.pc.connectionState}`);
    };

    this.pc.oniceconnectionstatechange = () => {
      const timestamp = new Date().toISOString().split("T")[1].replace("Z", "");
      this.stats.iceConnectionState = this.pc.iceConnectionState;
      console.log(`[${timestamp}] [${sessionId}] 🧊 ICE connection state: ${this.pc.iceConnectionState}`);
    };

    this.pc.ondatachannel = (event) => {
      console.log(`[${sessionId}] 📡 DataChannel received from client`);
      // werift type mismatch
      this.dataChannel = event.channel as unknown as RTCDataChannel;

      this.setupDataChannelHandlers();
    };

    this.pc.ontrack = () => {
      console.log(`[${sessionId}] 🎵 Audio track received from client`);
    };
  }

  /**
   * Set up DataChannel for control messages and audio data
   */
  private setupDataChannel(): void {
    const { sessionId } = this.config;

    // Create a DataChannel (client will also create one)
    this.dataChannel = this.pc.createDataChannel("xai-voice", {
      ordered: true,
    }) as unknown as RTCDataChannel;

    console.log(`[${sessionId}] 📡 DataChannel created`);
    this.setupDataChannelHandlers();
  }

  /**
   * Set up DataChannel message handlers
   */
  private setupDataChannelHandlers(): void {
    const { sessionId } = this.config;
    if (!this.dataChannel) throw new Error("DataChannel not found");

    this.dataChannel.onopen = () => {
      console.log(`[${sessionId}] ✅ DataChannel opened`);
    };

    this.dataChannel.onclose = () => {
      console.log(`[${sessionId}] ❌ DataChannel closed`);
    };

    this.dataChannel.onerror = (error: Event) => {
      console.error(`[${sessionId}] ❌ DataChannel error:`, error);
    };

    this.dataChannel.onmessage = async (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        // Handle audio data sent via DataChannel
        if (message.type === "input_audio_buffer.append") {
          // Forward audio to XAI API
          this.xaiClient.sendMessage(message);
        } else {
          // Forward control messages to XAI API
          console.log(`[${sessionId}] 📥 Client → Server (DC): ${message.type}`);
          this.xaiClient.sendMessage(message);
        }
      } catch (error) {
        console.error(`[${sessionId}] ❌ Error processing DataChannel message:`, error);
      }
    };
  }

  /**
   * Initialize and connect to XAI API
   */
  async initializeXAI(): Promise<void> {
    const { sessionId } = this.config;

    // Set up XAI message handler
    this.xaiClient.onMessage((message) => {
      // Handle audio from XAI API
      if (message.type === "response.output_audio.delta" && "delta" in message) {
        // Send audio via DataChannel to client
        if (this.dataChannel && this.dataChannel.readyState === "open") {
          this.dataChannel.send(JSON.stringify(message));
        }
      } else {
        // Forward non-audio messages via DataChannel
        if (this.dataChannel && this.dataChannel.readyState === "open") {
          this.dataChannel.send(JSON.stringify(message));
        }
      }
    });

    this.xaiClient.onError((error) => {
      console.error(`[${sessionId}] ❌ XAI error:`, error);
    });

    this.xaiClient.onClose((code, reason) => {
      console.log(`[${sessionId}] XAI connection closed: ${code} ${reason}`);
    });

    // Set up ready handler - notify client when XAI is ready for audio
    this.xaiClient.setReadyHandler(() => {
      console.log(`[${sessionId}] 📢 Notifying client that XAI is ready for audio`);
      if (this.dataChannel && this.dataChannel.readyState === "open") {
        this.dataChannel.send(
          JSON.stringify({
            type: "xai.ready",
            message: "XAI session configured, ready for audio input",
          })
        );
      }
    });

    // Connect to XAI API
    await this.xaiClient.connect();
  }

  /**
   * Create WebRTC offer
   */
  async createOffer(): Promise<{ type: RTCSdpType; sdp: string | undefined }> {
    const { sessionId } = this.config;
    const startTime = Date.now();
    console.log(`[${sessionId}] 📝 Creating offer...`);

    const offerCreated = Date.now();
    const offer = await this.pc.createOffer();
    console.log(`[${sessionId}] ⏱️  createOffer() took ${Date.now() - offerCreated}ms`);

    const setLocalStart = Date.now();
    await this.pc.setLocalDescription(offer);
    console.log(`[${sessionId}] ⏱️  setLocalDescription() took ${Date.now() - setLocalStart}ms`);
    console.log(`[${sessionId}] 🧊 ICE gathering state after setLocal: ${this.pc.iceGatheringState}`);

    console.log(`[${sessionId}] ✅ Offer created (total: ${Date.now() - startTime}ms)`);
    return { type: offer.type, sdp: this.pc.localDescription?.sdp };
  }

  /**
   * Handle WebRTC answer from client
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    const { sessionId } = this.config;
    console.log(`[${sessionId}] 📝 Setting remote description (answer)...`);

    await this.pc.setRemoteDescription(answer);

    console.log(`[${sessionId}] ✅ Remote description set`);
  }

  /**
   * Handle ICE candidate from client
   */
  async handleIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    const { sessionId } = this.config;

    try {
      // @eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error werift doesn't have the same addIceCandidate type as wrtc
      await this.pc.addIceCandidate(candidate);
      console.log(`[${sessionId}] 🧊 ICE candidate added`);
    } catch (error) {
      console.error(`[${sessionId}] ❌ Error adding ICE candidate:`, error);
    }
  }

  /**
   * Get current WebRTC statistics
   */
  async getStats(): Promise<WebRTCStats> {
    try {
      // Note: werift doesn't have the same getStats API as wrtc
      // For now, return current stats with updated timestamp
      this.stats.connectionState = this.pc.connectionState;
      this.stats.iceConnectionState = this.pc.iceConnectionState;
      this.stats.lastUpdated = new Date().toISOString();
      return this.stats;
    } catch (error) {
      console.error(`[${this.config.sessionId}] ❌ Error getting stats:`, error);
      return this.stats;
    }
  }

  /**
   * Get peer connection
   */
  getPeerConnection(): RTCPeerConnection {
    return this.pc;
  }

  /**
   * Close the peer connection and XAI client
   */
  close(): void {
    const { sessionId } = this.config;
    console.log(`[${sessionId}] 🔌 Closing peer connection...`);

    if (this.dataChannel) {
      this.dataChannel.close();
    }

    this.pc.close();
    this.xaiClient.close();

    console.log(`[${sessionId}] ✅ Peer connection closed`);
  }
}
