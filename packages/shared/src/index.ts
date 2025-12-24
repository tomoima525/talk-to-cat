/**
 * Shared type definitions for client and server
 */

// Session state
export interface Session {
  id: string;
  created_at: string;
  status: "created" | "active" | "closed";
  sample_rate: number;
  webrtcStats?: WebRTCStats;
}

// WebRTC connection statistics
export interface WebRTCStats {
  bitrate: {
    audio_in: number;
    audio_out: number;
  };
  jitter: number;
  packetLoss: number;
  connectionState: string;
  iceConnectionState: string;
  lastUpdated: string;
}
