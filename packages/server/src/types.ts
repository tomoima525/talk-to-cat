/**
 * Type definitions for WebRTC server
 */

import type { RTCPeerConnection } from "werift";
import type WebSocket from "ws";
import type { Session, WebRTCStats } from "@xai-avatar/shared";

// Re-export shared types for convenience
export type { Session, WebRTCStats };

// WebRTC signaling messages
export type SignalingMessage =
  | { type: "offer"; sdp: string }
  | { type: "answer"; sdp: string }
  | { type: "ice-candidate"; candidate: RTCIceCandidate }
  | { type: "ready" }
  | { type: "error"; message: string };

// XAI API message types
export interface XAIMessage {
  type: string;
  [key: string]: unknown;
  arguments?: string;
}

// Peer connection manager state
export interface PeerConnectionState {
  pc: RTCPeerConnection;
  dataChannel: RTCDataChannel;
  audioTrack: MediaStreamTrack;
  xaiWs: WebSocket | null;
  sessionId: string;
  stats: WebRTCStats;
}

// Audio buffer for processing
export interface AudioBuffer {
  data: Buffer;
  timestamp: number;
  sampleRate: number;
}
