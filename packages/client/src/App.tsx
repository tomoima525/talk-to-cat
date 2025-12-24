import { useState, useCallback, useEffect, useRef } from "react";
import { useWebRTC } from "./hooks/useWebRTC";
import { useAudioStream } from "./hooks/useAudioStream";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { Transcript } from "./components/Transcript";
import type { Message, TranscriptEntry } from "./types/messages";

function App() {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [currentAssistantText, setCurrentAssistantText] = useState("");
  const isConnectedRef = useRef(false);
  const assistantTextRef = useRef("");
  const sendMessageRef = useRef<((message: Message) => void) | null>(null);

  const {
    isCapturing,
    startCapture,
    stopCapture,
    playAudio,
    stopPlayback,
  } = useAudioStream();

  const handleMessage = useCallback((message: Message) => {
    switch (message.type) {
      case "response.output_audio.delta": {
        // Play audio from server
        const delta = (message as { delta: string }).delta;
        playAudio(delta);
        break;
      }
      case "response.output_audio_transcript.delta": {
        const delta = (message as { delta: string }).delta;
        assistantTextRef.current += delta;
        setCurrentAssistantText(assistantTextRef.current);
        break;
      }
      case "response.done": {
        const text = assistantTextRef.current.trim();
        if (text) {
          // Prevent duplicate entries by checking if text was already added
          setTranscripts((entries) => {
            const lastEntry = entries[entries.length - 1];
            if (lastEntry?.role === "assistant" && lastEntry?.content === text) {
              return entries; // Skip duplicate
            }
            return [
              ...entries,
              {
                timestamp: new Date().toISOString(),
                role: "assistant",
                content: text,
              },
            ];
          });
        }
        // Clear streaming state
        assistantTextRef.current = "";
        setCurrentAssistantText("");
        break;
      }
      case "input_audio_buffer.speech_started": {
        // User started speaking - stop any playing audio
        stopPlayback();
        break;
      }
      case "input_audio_buffer.speech_stopped": {
        // User stopped speaking
        break;
      }
      case "input_audio_buffer.committed": {
        // Audio committed - add user message placeholder
        setTranscripts((entries) => {
          // Prevent duplicate user placeholders
          const lastEntry = entries[entries.length - 1];
          if (lastEntry?.role === "user" && lastEntry?.content === "[Speaking...]") {
            return entries; // Skip duplicate
          }
          return [
            ...entries,
            {
              timestamp: new Date().toISOString(),
              role: "user",
              content: "[Speaking...]",
            },
          ];
        });
        break;
      }
      case "error": {
        const errorMsg = (message as { error?: { message?: string } }).error?.message || "Unknown error";
        console.error("Server error:", errorMsg);
        break;
      }
    }
  }, [playAudio, stopPlayback]);

  const {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendMessage,
    connectionQuality,
  } = useWebRTC(handleMessage);

  // Track connection state and sendMessage in refs for use in audio callback
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  // Start/stop audio capture based on connection state
  useEffect(() => {
    if (isConnected && !isCapturing) {
      // Start capturing audio when connected
      startCapture((base64Audio) => {
        // Send audio to server via WebRTC DataChannel
        if (isConnectedRef.current && sendMessageRef.current) {
          sendMessageRef.current({
            type: "input_audio_buffer.append",
            audio: base64Audio,
          });
        }
      }).catch((error) => {
        console.error("Failed to start audio capture:", error);
      });
    } else if (!isConnected && isCapturing) {
      // Stop capturing when disconnected
      stopCapture();
    }
  }, [isConnected, isCapturing, startCapture, stopCapture]);

  const handleConnect = useCallback(async () => {
    try {
      // Get sample rate from audio context and connect with it
      const audioContext = new AudioContext();
      const sampleRate = audioContext.sampleRate;
      audioContext.close();

      await connect(sampleRate);
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  }, [connect]);

  const handleDisconnect = useCallback(() => {
    stopCapture();
    stopPlayback();
    disconnect();
    setTranscripts([]);
    setCurrentAssistantText("");
  }, [disconnect, stopCapture, stopPlayback]);

  // Combine completed transcripts with current streaming text
  const displayTranscripts: TranscriptEntry[] = [
    ...transcripts,
    ...(currentAssistantText
      ? [
          {
            timestamp: new Date().toISOString(),
            role: "assistant" as const,
            content: currentAssistantText,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="border-b border-gray-700 p-4">
        <h1 className="text-xl font-semibold">XAI Avatar</h1>
      </header>

      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <div className="p-4">
          <ConnectionStatus
            isConnected={isConnected}
            isConnecting={isConnecting}
            connectionQuality={connectionQuality}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
          {isCapturing && (
            <div className="mt-2 text-sm text-green-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Microphone active
            </div>
          )}
        </div>

        <Transcript entries={displayTranscripts} />
      </main>
    </div>
  );
}

export default App;
