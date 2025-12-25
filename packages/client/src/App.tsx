import { useState, useCallback, useEffect, useRef } from "react";
import { useWebRTC } from "./hooks/useWebRTC";
import { useAudioStream } from "./hooks/useAudioStream";
import { useAudioAmplitude } from "./hooks/useAudioAmplitude";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { Transcript } from "./components/Transcript";
import { AvatarPanel } from "./components/AvatarPanel";
import type { Message, TranscriptEntry } from "./types/messages";

function App() {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [currentAssistantText, setCurrentAssistantText] = useState("");
  const isConnectedRef = useRef(false);
  const assistantTextRef = useRef("");
  const sendMessageRef = useRef<((message: Message) => void) | null>(null);

  // Audio amplitude analysis for lip-sync animation
  const { amplitudeRef, createAnalyser, startSampling, stopSampling } = useAudioAmplitude();

  // Pass createAnalyser to useAudioStream so it uses the same AudioContext
  const { isCapturing, isPlaying, startCapture, stopCapture, playAudio, stopPlayback } = useAudioStream({ createAnalyser });

  // Start/stop amplitude sampling based on playback state
  useEffect(() => {
    if (isPlaying) {
      startSampling();
    } else {
      stopSampling();
    }
  }, [isPlaying, startSampling, stopSampling]);

  const handleMessage = useCallback(
    (message: Message) => {
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
          // User started speaking - stop any playing audio (interruption)
          stopPlayback();
          console.log("User interrupted - stopping playback");

          // Add a user entry immediately with "..." placeholder
          // Only add if the last entry isn't already a pending user entry
          setTranscripts((entries) => {
            const lastEntry = entries[entries.length - 1];
            if (lastEntry?.role === "user" && (lastEntry?.content === "..." || lastEntry?.content === "")) {
              return entries; // Already have a pending user entry
            }
            return [
              ...entries,
              {
                timestamp: new Date().toISOString(),
                role: "user",
                content: "...",
              },
            ];
          });
          break;
        }
        case "input_audio_buffer.speech_stopped": {
          // User stopped speaking - transcript will come in conversation.item.added
          break;
        }
        case "input_audio_buffer.committed": {
          // User finished speaking - transcript will arrive via conversation.item.added
          break;
        }
        case "conversation.item.added": {
          console.log("conversation.item.added", JSON.stringify(message, null, 2));
          // Handle conversation item created (contains user transcript)
          // Consolidate all user transcripts into a single bubble until assistant responds
          const item = (message as { item?: { role?: string; content?: Array<{ type: string; transcript?: string }> } })
            .item;
          if (item?.role === "user" && item?.content) {
            for (const content of item.content) {
              if (content.type === "input_audio" && content.transcript) {
                const transcript = content.transcript;
                setTranscripts((entries) => {
                  // If the last entry is from user, update it (consolidate until assistant responds)
                  const lastEntry = entries[entries.length - 1];
                  if (lastEntry?.role === "user") {
                    const newEntries = [...entries];
                    // Append new transcript to existing content (separated by space if not placeholder)
                    const existingContent = lastEntry.content === "..." ? "" : lastEntry.content + " ";
                    newEntries[newEntries.length - 1] = {
                      ...lastEntry,
                      content: existingContent + transcript,
                    };
                    return newEntries;
                  }
                  // Otherwise add a new user entry
                  return [
                    ...entries,
                    {
                      timestamp: new Date().toISOString(),
                      role: "user",
                      content: transcript,
                    },
                  ];
                });
                break; // Only process the first transcript content
              }
            }
          }
          break;
        }
        case "conversation.item.input_audio_transcription.completed": {
          // Fallback: Update the user's "..." placeholder with actual transcript
          const transcript = (message as { transcript: string }).transcript;
          if (transcript) {
            setTranscripts((entries) => {
              // Find the last user message with "..." and update it
              const newEntries = [...entries];
              for (let i = newEntries.length - 1; i >= 0; i--) {
                if (newEntries[i].role === "user" && newEntries[i].content === "...") {
                  newEntries[i] = {
                    ...newEntries[i],
                    content: transcript,
                  };
                  break;
                }
              }
              return newEntries;
            });
          }
          break;
        }
        case "error": {
          const errorMsg = (message as { error?: { message?: string } }).error?.message || "Unknown error";
          console.error("Server error:", errorMsg);
          break;
        }
      }
    },
    [playAudio, stopPlayback]
  );

  const { isConnected, isConnecting, connect, disconnect, sendMessage, connectionQuality } = useWebRTC(handleMessage);

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
    <div className="grid grid-cols-[750px_1fr] h-screen bg-black">
      {/* Left sidebar - Avatar */}
      <div className="h-full border-r-2 border-gray-700">
        <AvatarPanel amplitudeRef={amplitudeRef} />
      </div>

      {/* Right content area */}
      <div className="flex flex-col overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">
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
    </div>
  );
}

export default App;
